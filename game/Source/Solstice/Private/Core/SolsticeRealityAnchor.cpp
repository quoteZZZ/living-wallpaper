// Solstice - Core layer: reality anchor implementation.

#include "Core/SolsticeRealityAnchor.h"

#include "Core/SolsticeLocalization.h"
#include "Dom/JsonObject.h"
#include "HttpModule.h"
#include "Interfaces/IHttpResponse.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace Solstice
{

namespace
{
	const TArray<FSolsticeCity>& CityTable()
	{
		static const TArray<FSolsticeCity> Cities = {
			{ TEXT("shanghai"),  TEXT("上海"),   TEXT("Shanghai"),  31.23f, 121.47f },
			{ TEXT("beijing"),   TEXT("北京"),   TEXT("Beijing"),   39.90f, 116.41f },
			{ TEXT("guangzhou"), TEXT("广州"),   TEXT("Guangzhou"), 23.13f, 113.26f },
			{ TEXT("shenzhen"),  TEXT("深圳"),   TEXT("Shenzhen"),  22.54f, 114.06f },
			{ TEXT("chengdu"),   TEXT("成都"),   TEXT("Chengdu"),   30.57f, 104.07f },
			{ TEXT("xian"),      TEXT("西安"),   TEXT("Xian"),      34.34f, 108.94f },
			{ TEXT("harbin"),    TEXT("哈尔滨"), TEXT("Harbin"),    45.80f, 126.53f },
			{ TEXT("urumqi"),    TEXT("乌鲁木齐"), TEXT("Urumqi"),  43.83f,  87.62f },
			{ TEXT("lhasa"),     TEXT("拉萨"),   TEXT("Lhasa"),     29.65f,  91.14f },
			{ TEXT("kunming"),   TEXT("昆明"),   TEXT("Kunming"),   25.04f, 102.72f }
		};
		return Cities;
	}

	int32 DayOfYearFromDate(int32 Year, int32 Month, int32 Day)
	{
		static const int32 Table[12] = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
		int32 Total = FMath::Clamp(Day, 1, 31) - 1;
		for (int32 M = 1; M < FMath::Clamp(Month, 1, 12); ++M)
		{
			Total += Table[M - 1];
			if (M == 2 && ((Year % 4 == 0 && Year % 100 != 0) || Year % 400 == 0))
			{
				Total += 1;
			}
		}
		return Total;
	}
}

FSolsticeRealityAnchor::FSolsticeRealityAnchor() = default;
FSolsticeRealityAnchor::~FSolsticeRealityAnchor() = default;

const TArray<FSolsticeCity>& FSolsticeRealityAnchor::GetCities()
{
	return CityTable();
}

void FSolsticeRealityAnchor::Initialize(const FString& InCityKey)
{
	CityKey = InCityKey;
	const TArray<FSolsticeCity>& Cities = CityTable();
	for (const FSolsticeCity& City : Cities)
	{
		if (CityKey.Equals(City.Key, ESearchCase::IgnoreCase))
		{
			Latitude = City.Latitude;
			Longitude = City.Longitude;
			break;
		}
	}
	RefreshClock();
}

FString FSolsticeRealityAnchor::GetCityName() const
{
	const bool bChinese = Solstice::LocIsChinese();
	for (const FSolsticeCity& City : CityTable())
	{
		if (CityKey.Equals(City.Key, ESearchCase::IgnoreCase))
		{
			return bChinese ? FString(City.NameZh) : FString(City.NameEn);
		}
	}
	return CityKey;
}

void FSolsticeRealityAnchor::Tick(double RealDeltaSeconds, bool bAllowNetwork)
{
	RefreshClock();

	SecondsSinceWeatherFetch += RealDeltaSeconds;
	if (!bAllowNetwork)
	{
		bWeatherFromNetwork = false;
		return;
	}
	// Weather refreshes every 30 real minutes (docs/gameplay/TIME.md SS4.1).
	if (!bRequestInFlight && SecondsSinceWeatherFetch >= 1800.0)
	{
		SecondsSinceWeatherFetch = 0.0;
		BeginWeatherRequest();
	}
}

void FSolsticeRealityAnchor::RefreshClock()
{
	const FDateTime Now = FDateTime::Now();
	const FTimespan SinceMidnight = Now.GetTimeOfDay();
	Sample.bValid = true;
	Sample.Year = Now.GetYear();
	Sample.Month = Now.GetMonth();
	Sample.Day = Now.GetDay();
	Sample.MinutesOfDay = static_cast<float>(SinceMidnight.GetTotalMinutes());
	const int32 DayOfYear = DayOfYearFromDate(Sample.Year, Sample.Month, Sample.Day);
	Sample.DayOfYearFraction = static_cast<float>(DayOfYear) / 365.0f;
}

void FSolsticeRealityAnchor::BeginWeatherRequest()
{
	if (bRequestInFlight)
	{
		return;
	}
	bRequestInFlight = true;

	// Open-Meteo, free and key-less (docs/gameplay/TIME.md SS4.2).
	const FString Url = FString::Printf(
		TEXT("https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f")
		TEXT("&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m"),
		Latitude, Longitude);

	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
	Request->SetURL(Url);
	Request->SetVerb(TEXT("GET"));
	Request->SetTimeout(5.0f);
	Request->OnProcessRequestComplete().BindRaw(this, &FSolsticeRealityAnchor::OnWeatherResponse);
	Request->ProcessRequest();
}

void FSolsticeRealityAnchor::OnWeatherResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bConnectedOk)
{
	bRequestInFlight = false;

	if (!bConnectedOk || !Response.IsValid() || Response->GetResponseCode() != 200)
	{
		++FailureCount;
		LastError = FString::Printf(TEXT("weather request failed (%d)"), Response.IsValid() ? Response->GetResponseCode() : 0);
		bWeatherFromNetwork = false;
		return;
	}

	TSharedPtr<FJsonObject> Root;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Response->GetContentAsString());
	if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
	{
		++FailureCount;
		LastError = TEXT("weather payload parse failed");
		bWeatherFromNetwork = false;
		return;
	}

	const TSharedPtr<FJsonObject>* Current = nullptr;
	if (!Root->TryGetObjectField(TEXT("current"), Current) || !Current || !Current->IsValid())
	{
		++FailureCount;
		LastError = TEXT("weather payload has no \"current\" block");
		bWeatherFromNetwork = false;
		return;
	}

	double Number = 0.0;
	if ((*Current)->TryGetNumberField(TEXT("temperature_2m"), Number)) { Sample.TemperatureC = static_cast<float>(Number); }
	if ((*Current)->TryGetNumberField(TEXT("relative_humidity_2m"), Number)) { Sample.Humidity01 = FMath::Clamp(static_cast<float>(Number) / 100.0f, 0.0f, 1.0f); }
	if ((*Current)->TryGetNumberField(TEXT("precipitation"), Number)) { Sample.PrecipitationMm = static_cast<float>(Number); }
	if ((*Current)->TryGetNumberField(TEXT("cloud_cover"), Number)) { Sample.CloudCover01 = FMath::Clamp(static_cast<float>(Number) / 100.0f, 0.0f, 1.0f); }
	if ((*Current)->TryGetNumberField(TEXT("wind_speed_10m"), Number)) { Sample.WindSpeedMs = static_cast<float>(Number); }
	if ((*Current)->TryGetNumberField(TEXT("wind_direction_10m"), Number)) { Sample.WindDirectionDeg = static_cast<float>(Number); }

	Sample.bWeatherFromNetwork = true;
	bWeatherFromNetwork = true;
	FailureCount = 0;
	LastError.Empty();
}

FString FSolsticeRealityAnchor::GetStatusZh() const
{
	if (bWeatherFromNetwork)
	{
		return FString::Printf(TEXT("联网天气 · %s"), *GetCityName());
	}
	if (FailureCount >= 3)
	{
		return FString::Printf(TEXT("离线态 · %s（虚拟天气）"), *GetCityName());
	}
	return FString::Printf(TEXT("等待天气 · %s"), *GetCityName());
}

FString FSolsticeRealityAnchor::GetStatusEn() const
{
	if (bWeatherFromNetwork)
	{
		return FString::Printf(TEXT("live weather - %s"), *GetCityName());
	}
	if (FailureCount >= 3)
	{
		return FString::Printf(TEXT("offline - %s (virtual weather)"), *GetCityName());
	}
	return FString::Printf(TEXT("waiting for weather - %s"), *GetCityName());
}

} // namespace Solstice

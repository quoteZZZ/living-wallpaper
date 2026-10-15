// Solstice - Sim layer: plain data types shared by the whole game.
//
// HARD RULE (docs/tech/STRUCTURE.md SS7.1): nothing in Sim/ may derive from UObject, and
// Sim/ may not depend on Tick / rendering / input. Everything here is a plain struct or a
// plain enum class, so the kernel can be driven headless and unit-checked.
//
// Design truth: docs/charter/GDD.md (owner) + docs/setting/* + docs/gameplay/*.

#pragma once

#include "CoreMinimal.h"

namespace Solstice
{
	// ------------------------------------------------------------------
	// Enumerations
	// ------------------------------------------------------------------

	/** Seven primal elements (docs/setting/WORLD.md SS1.2). Fixed set, never extended. */
	enum class EElement : uint8
	{
		None = 0,
		Metal,	// metal
		Wood,
		Water,
		Fire,
		Earth,
		Light,
		Dark,
		Count
	};

	/** Card class: what the card *is* in the world (docs/setting/CARDS.md SS4). */
	enum class ECardClass : uint8
	{
		Matter = 0,	// object
		Rite,		// active effect
		Law,		// written rule
		Count
	};

	/** Persistence field (docs/setting/CARDS.md SS6). */
	enum class EDuration : uint8
	{
		Instant = 0,
		Sustain,
		Permanent,
		Trigger,
		Count
	};

	enum class EDirection : uint8
	{
		Create = 0,
		Remove,
		Transform,
		Count
	};

	enum class EScope : uint8
	{
		Global = 0,
		Area,
		Single,
		Brush,
		Count
	};

	/** Dual time mode (docs/gameplay/TIME.md SS2). */
	enum class ETimeMode : uint8
	{
		Virtual = 0,
		Real,
		Count
	};

	/** M0 minimal weather state machine (docs/setting/WORLD.md SS3.2). */
	enum class EWeather : uint8
	{
		Clear = 0,
		Cloudy,
		LightRain,
		Storm,
		Fog,
		Count
	};

	/** M0 biomes (docs/setting/WORLD.md SS2.2) plus the chaos initial state. */
	enum class EBiome : uint8
	{
		Chaos = 0,
		Water,
		Grass,
		Woodland,
		RockSlope,
		Count
	};

	enum class EWaterBody : uint8
	{
		None = 0,
		Lake,
		River,
		Sea,
		Wetland,
		Count
	};

	/** Material dictionary (docs/setting/PHYSICS.md SS2.1 table A/B). */
	enum class EMaterial : uint8
	{
		Paper = 0,
		Soil,
		Clay,
		Mud,
		Stone,
		Ore,
		DeadWood,
		LivePlant,
		Water,
		Magma,
		Ice,
		Snow,
		Sand,
		Ash,
		Tissue,
		Count
	};

	/** M0 species set (docs/setting/SPECIES.md SS2). */
	enum class ESpeciesKind : uint8
	{
		MossGrass = 0,
		Shrub,
		Grazer,
		Raptor,
		StreamFish,
		Count
	};

	/** Death causes, always readable on screen (docs/setting/SPECIES.md SS5). */
	enum class EDeathCause : uint8
	{
		None = 0,
		Starved,
		Predated,
		Frozen,
		Drowned,
		Aged,
		Desiccated,
		Count
	};

	enum class EEventType : uint8
	{
		Genesis = 0,
		Terrain,
		Weather,
		Ecology,
		Echo,
		TimeMode,
		Reality,
		Trigger,
		InterAction,
		Count
	};

	/**
	 * Concrete simulated effects used by M0 cards. These are the card-facing names for the
	 * seven physical abilities listed in docs/setting/PHYSICS.md SS6 (terrain op, state
	 * change, attribute write, eco op, record op...).
	 */
	enum class EEffect : uint8
	{
		None = 0,
		RaiseTerrain,
		LowerTerrain,
		FlattenTerrain,
		RidgeLine,
		PaintSurface,
		Ignite,
		HeatArea,
		ChillArea,
		WaterLevel,
		OreVein,
		SeedLife,
		RecordPillar,
		ErodeSurface,
		WeatherPush,
		Count
	};

	/** Pack kinds (docs/gameplay/INTERVENTION.md SS4.1). */
	enum class EPackKind : uint8
	{
		RandomElement = 0,
		SpecificElement,
		Special,
		Count
	};

	/** Split RNG streams, so one system's draws never shift another's sequence. */
	enum class ERngStream : uint8
	{
		Terrain = 0,
		Eco,
		Weather,
		Event,
		Loot,
		Count
	};

	// ------------------------------------------------------------------
	// Sim constant tables (transcribed from docs; tune here without touching structure)
	// ------------------------------------------------------------------

	namespace Tuning
	{
		/** docs/gameplay/ECONOMY.md SS3.1 - value by tier. Index 10 = over-tier, 11 = forbidden. */
		extern const int32 CardValue[12];

		/** docs/gameplay/ECONOMY.md SS3.2 - recycle refund by tier (0 and forbidden cannot be recycled). */
		extern const int32 RecycleRefund[12];

		/** docs/gameplay/ECONOMY.md SS5.1 - pack drop weights for tiers 0..9 (percent, sums to 100). */
		extern const float TierWeight[10];

		/** docs/gameplay/ECONOMY.md SS2.1 - event echo by offset bracket (min/max inclusive). */
		extern const float OffsetBracket[5][2];
		extern const int32 EchoBracketMin[5];
		extern const int32 EchoBracketMax[5];

		extern const int32 PackPriceRandom;		// 70
		extern const int32 PackPriceSpecific;	// 105
		extern const int32 PackPriceSpecial;	// 150
		extern const int32 StylePackPrice;		// 400
		extern const float SpecialPackOverTierChance;	// 0.08
		extern const int32 FirsthandWeather;	// 20
		extern const int32 FirsthandEco;		// 25
		extern const int32 FirsthandExtinction;// 40
		extern const int32 MaxCopiesPerKind;	// 3
		extern const int32 HandSize;			// 10
		extern const int32 ChronicleCapacity;	// 500
		extern const float DisturbanceDecayPerWorldHour;	// -2
		extern const int32 EchoPerMinuteCap;	// 20
		extern const float EchoOverCapMultiplier;	// 0.25
		extern const float SedimentCoefficient;		// 0.5
		extern const float DisturbancePenaltyThreshold;	// 60
		extern const int32 WorldMinutesPerWorldDay;	// 1440
		extern const float DefaultRealMinutesPerWorldDay;	// 3
		extern const float TileSizeMeters;		// 1.0
		extern const float MaxHeightMeters;		// 64.0
		extern const float HeightQuantum;		// 0.25
		extern const float BiomeDesertFertility;	// 0.15
		extern const float LapseRatePer100m;	// -0.6
		extern const int32 IndividualBudgetSmall;	// 1200 (docs WORLD SS2.1)
	}

	// ------------------------------------------------------------------
	// World data
	// ------------------------------------------------------------------

	/** One tile = 1 m x 1 m (docs/setting/WORLD.md SS2.1). */
	struct SOLSTICE_API FTile
	{
		float Height = 0.0f;			// 0..64 m, quantised to 0.25 m
		float Vegetation = 0.0f;		// 0..1
		float Moisture = 0.0f;			// 0..1
		float Fertility = 0.0f;			// 0..1
		float LocalTempC = 12.0f;		// degC
		float Burning = 0.0f;			// 0 = unlit, 0..1 = 明燃 intensity
		float Painted = 0.0f;			// 0 = raw paper (chaos), 1 = fully coloured
		float Ash = 0.0f;				// 0..1 burnt layer, feeds fertility
		uint8 Mat = static_cast<uint8>(EMaterial::Paper);
		uint8 Biome = static_cast<uint8>(EBiome::Chaos);
		uint8 WaterBody = static_cast<uint8>(EWaterBody::None);

		EMaterial GetMat() const { return static_cast<EMaterial>(Mat); }
		EBiome GetBiome() const { return static_cast<EBiome>(Biome); }
		EWaterBody GetWater() const { return static_cast<EWaterBody>(WaterBody); }
		bool IsWater() const { return GetWater() != EWaterBody::None; }
	};

	struct SOLSTICE_API FWorldConfig
	{
		int32 Size = 128;					// 小界 128 x 128 (docs/setting/WORLD.md SS2.1)
		int32 ChunkSize = 64;				// 分块 64 x 64
		int32 Algo = 0;						// 0 ridges / 1 islands / 2 canyon / 3 plateau / 4 basin / 5 archipelago
		uint32 Seed = 20261016u;
		float BaseWaterLevel = 6.0f;
		float Latitude = 31.23f;			// real-world anchor (docs/gameplay/TIME.md SS4.2)
		float TidalAmplitude = 1.0f;
		bool bTides = false;
		bool bChaosStart = true;			// 混沌初态: no life, uncoloured paper (WORLD SS3.3 step 5)
		bool bWithLifeSeed = false;			// creator step 8 "life seed"
		int32 StartingDayOfYear = -1;		// -1 = derive from the real clock
		FString RealmId = TEXT("realm.valley-20261016");
		FString RealmNameZh = TEXT("无名之界");
		FString RealmNameEn = TEXT("Nameless Realm");
	};

	/** Environmental readouts (docs/setting/WORLD.md SS3.2). */
	struct SOLSTICE_API FSkyState
	{
		float SolarAltitudeDeg = 45.0f;
		float SunAzimuthDeg = 180.0f;
		float LightIntensity = 1.0f;		// 0..1 horizontal irradiance multiplier
		float ColorTempK = 5600.0f;
		float AirTempC = 14.0f;
		float Humidity = 0.45f;
		float CloudCover = 0.15f;
		float RainIntensity = 0.0f;			// 0..1
		float WindSpeed = 1.0f;
		float WindDirDeg = 270.0f;
		float OxygenLevel = 1.0f;
		float WaterLevel = 6.0f;
		uint8 Weather = static_cast<uint8>(EWeather::Clear);
		bool bSnowing = false;				// rain replaced by snow below 0 degC
		bool bRealityOffline = false;		// weather API degraded (docs/gameplay/TIME.md SS4.2)
		float DayFraction = 0.5f;			// 0 = midnight, 0.5 = noon

		EWeather GetWeather() const { return static_cast<EWeather>(Weather); }
	};

	/** A living individual (docs/setting/SPECIES.md SS2). */
	struct FIndividual
	{
		int32 Tile = 0;
		uint32 Id = 0;
		float Energy = 100.0f;
		float AgeDays = 0.0f;
		float RestTimer = 0.0f;
		uint32 PreyCount = 0;			// raptor breeding counter
		uint8 Kind = 0;					// ESpeciesKind
		uint8 Facing = 0;				// 0..7, presentation only
		uint8 Status = 0;				// 0 idle / 1 foraging / 2 hunting / 3 resting / 4 breeding
		ESpeciesKind GetKind() const { return static_cast<ESpeciesKind>(Kind); }
	};

	/** Transient on-screen death marker so a cause is always readable (SPECIES SS5). */
	struct FDeathMark
	{
		int32 Tile = 0;
		float TimeToLive = 0.0f;
		uint8 Cause = 0;
	};

	struct FChronicleEntry
	{
		int32 WorldYear = 1;
		int32 WorldDay = 1;
		int32 MinuteOfDay = 0;
		int32 RealYear = 2026;
		int32 RealMonth = 10;
		int32 RealDay = 16;
		uint8 Type = static_cast<uint8>(EEventType::Genesis);
		uint8 Element = static_cast<uint8>(EElement::None);
		uint8 Tier = 255;
		FString SubjectZh;
		FString SubjectEn;
		FString SummaryZh;
		FString SummaryEn;

		EEventType GetType() const { return static_cast<EEventType>(Type); }
	};

	/** Echo accounting, one and only one account (docs/gameplay/ECONOMY.md SS7.2). */
	struct FEchoLedger
	{
		int32 Balance = 0;
		int32 FromEvent = 0;
		int32 FromSediment = 0;
		int32 FromFirsthand = 0;
		int32 FromRecycle = 0;
		int32 FromAutoConvert = 0;
		int32 SpentPacks = 0;
		int32 SpentCalm = 0;
		int32 SpentStyle = 0;
		int32 EchoLastRealMinute = 0;
	};

	// ------------------------------------------------------------------
	// Card catalogue (runtime data, loaded from Config/Solstice/Data/cards.*.json)
	// ------------------------------------------------------------------

	struct FCardDef
	{
		FName Id;
		FString NameZh;
		FString NameEn;
		FString DescZh;
		FString DescEn;
		uint8 Element = static_cast<uint8>(EElement::None);
		uint8 ElementAux = static_cast<uint8>(EElement::None);	// second tag for multi-element cards
		uint8 Tier = 0;					// 0..9 / 10 = over-tier / 11 = forbidden
		uint8 CardClass = 0;			// ECardClass
		uint8 Duration = 0;				// EDuration
		uint8 Direction = 0;			// EDirection
		uint8 Scope = 0;				// EScope
		uint8 Effect = 0;				// EEffect
		int32 Value = 5;
		bool bProvisional = false;		// M0 grid slot written for playability, pending per-card authoring
		TMap<FString, float> Params;

		EElement GetElement() const { return static_cast<EElement>(Element); }
		ECardClass GetCardClass() const { return static_cast<ECardClass>(CardClass); }
		EDuration GetDuration() const { return static_cast<EDuration>(Duration); }
		EEffect GetEffect() const { return static_cast<EEffect>(Effect); }
		bool IsForbidden() const { return Tier == 11; }
		bool IsOverTier() const { return Tier == 10; }

		float Param(const TCHAR* Key, float Fallback = 0.0f) const
		{
			const float* Found = Params.Find(FString(Key));
			return Found ? *Found : Fallback;
		}
	};

	struct FSpeciesDef
	{
		FName Id;
		FString NameZh;
		FString NameEn;
		uint8 Kind = 0;					// ESpeciesKind
		uint8 Role = 0;					// 0 cover producer / 1 standing producer / 2 consumer
		float HeightM = 0.5f;
		float LengthM = 0.8f;
		float LifespanDays = 90.0f;
		float MaturityDays = 5.0f;
		float EnergyMax = 100.0f;
		float EnergyDrainPerHour = 1.0f;
		float EatVegetationPerHour = 0.03f;
		float BreedEnergyFraction = 0.7f;
		float BreedVegetation = 0.5f;
		float BreedCostEnergy = 40.0f;
		float MoveCellsPerHour = 2.0f;
		float TempMinC = 10.0f;
		float TempMaxC = 28.0f;
		float WaterReachCells = 8.0f;
		float PredationSuccess = 0.3f;
		float StarvationDays = 4.0f;
		float GrowthPerHour = 0.02f;
		float FertilityCostPerHour = 0.01f;
		int32 CarryCapacityPerTile = 1;
		bool bAquatic = false;
		bool bFlying = false;
		bool bCover = false;			// moss-grass: a coverage layer, no individual tiles
	};

	struct SOLSTICE_API FCatalog
	{
		TArray<FCardDef> Cards;
		TArray<FSpeciesDef> Species;
		TArray<FWorldConfig> Presets;

		int32 FindCard(const FName& Id) const;
		int32 FindSpecies(uint8 Kind) const;
		const FCardDef* CardAt(int32 Index) const;
	};

	// ------------------------------------------------------------------
	// Transient result payloads
	// ------------------------------------------------------------------

	struct FReleaseResult
	{
		bool bOk = false;
		bool bCrossedThreshold = false;
		bool bCanUndo = false;
		float Offset = 0.0f;
		int32 EchoGained = 0;
		FString ReasonZh;
		FString ReasonEn;
		/** Tiles the effect touched, kept so the 3 second "wet paper" undo window can rewind them. */
		TArray<int32> AffectedTiles;
	};

	struct FPackResult
	{
		TArray<int32> Cards;			// indices into the catalogue
		int32 Cost = 0;
		int32 ConvertedEcho = 0;		// auto-converted overflow past the 3-copy cap
		FString TitleZh;
		FString TitleEn;
	};

	// ------------------------------------------------------------------
	// Small helpers shared by Sim and the UE layer
	// ------------------------------------------------------------------

	const TCHAR* ElementId(EElement Element);
	const TCHAR* ElementGlyph(EElement Element);		// zh label
	const TCHAR* ElementGlyphEn(EElement Element);
	const TCHAR* CardClassId(ECardClass Class);
	const TCHAR* CardClassGlyph(ECardClass Class);
	const TCHAR* DurationGlyph(EDuration Duration);
	const TCHAR* WeatherGlyph(EWeather Weather);
	const TCHAR* BiomeGlyph(EBiome Biome);
	const TCHAR* MaterialGlyph(EMaterial Material);
	const TCHAR* DeathCauseGlyph(EDeathCause Cause);
	const TCHAR* SpeciesId(ESpeciesKind Kind);
	const TCHAR* SpeciesGlyphZh(ESpeciesKind Kind);

	/** Presentation only - never read by the simulation. */
	FLinearColor ElementColor(EElement Element);
	FLinearColor CardClassColor(ECardClass Class);
	FLinearColor MaterialColor(EMaterial Material);

	/** Paper base tones used by the chaos (uncoloured) state, docs/setting/WORLD.md SS3.3. */
	FLinearColor RawPaperColor();
	FLinearColor KraftPaperColor();

	/** Tier display: 0..9 numeric, "over" for the over-tier, "ban" for forbidden. */
	FString TierLabel(int32 Tier);
}

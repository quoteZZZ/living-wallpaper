// Solstice - Sim layer: constant tables and display helpers.
// Every number in this file is transcribed from the design docs; the doc section is cited
// next to it so a tune can be traced back to its truth source.

#include "Sim/SolsticeTypes.h"

namespace Solstice
{
	namespace Tuning
	{
		// docs/gameplay/ECONOMY.md SS3.1
		const int32 CardValue[12] = { 5, 10, 20, 30, 50, 80, 120, 180, 260, 380, 760, 0 };

		// docs/gameplay/ECONOMY.md SS3.2 (index 0 and 11 cannot be recycled)
		const int32 RecycleRefund[12] = { 0, 3, 6, 9, 25, 40, 60, 126, 182, 266, 532, 0 };

		// docs/gameplay/ECONOMY.md SS5.1 (percent per tier, sums to 100)
		const float TierWeight[10] =
		{
			40.0f, 22.0f, 14.0f, 10.0f, 6.0f, 4.0f, 2.0f, 1.2f, 0.5f, 0.3f
		};

		// docs/gameplay/ECONOMY.md SS2.1.1 offset brackets
		const float OffsetBracket[5][2] =
		{
			{ 0.0f, 0.05f },
			{ 0.05f, 0.15f },
			{ 0.15f, 0.30f },
			{ 0.30f, 0.60f },
			{ 0.60f, 100.0f }
		};
		const int32 EchoBracketMin[5] = { 1, 4, 12, 30, 100 };
		const int32 EchoBracketMax[5] = { 3, 10, 25, 60, 400 };

		// docs/gameplay/ECONOMY.md SS4
		const int32 PackPriceRandom = 70;
		const int32 PackPriceSpecific = 105;
		const int32 PackPriceSpecial = 150;
		const int32 StylePackPrice = 400;

		// docs/gameplay/ECONOMY.md SS5.2
		const float SpecialPackOverTierChance = 0.08f;

		// docs/gameplay/ECONOMY.md SS2.3 (one-off first-sight rewards)
		const int32 FirsthandWeather = 20;
		const int32 FirsthandEco = 25;
		const int32 FirsthandExtinction = 40;

		// docs/gameplay/INTERVENTION.md SS1.6 / SS1.5
		const int32 MaxCopiesPerKind = 3;
		const int32 HandSize = 10;

		// docs/setting/WORLD.md SS4
		const int32 ChronicleCapacity = 500;

		// docs/gameplay/INTERVENTION.md SS3
		const float DisturbanceDecayPerWorldHour = -2.0f;

		// docs/gameplay/ECONOMY.md SS2.1 rule 3
		const int32 EchoPerMinuteCap = 20;
		const float EchoOverCapMultiplier = 0.25f;

		// docs/gameplay/ECONOMY.md SS2.2
		const float SedimentCoefficient = 0.5f;
		const float DisturbancePenaltyThreshold = 60.0f;

		// docs/gameplay/TIME.md SS2.1
		const int32 WorldMinutesPerWorldDay = 1440;
		const float DefaultRealMinutesPerWorldDay = 3.0f;

		// docs/setting/WORLD.md SS2.1
		const float TileSizeMeters = 1.0f;
		const float MaxHeightMeters = 64.0f;
		const float HeightQuantum = 0.25f;

		// docs/setting/WORLD.md SS2.2 / SS3.2
		const float BiomeDesertFertility = 0.15f;
		const float LapseRatePer100m = -0.6f;

		// docs/setting/WORLD.md SS2.1
		const int32 IndividualBudgetSmall = 1200;
	}

	// ------------------------------------------------------------------
	// Naming helpers
	// ------------------------------------------------------------------

	const TCHAR* ElementId(EElement Element)
	{
		switch (Element)
		{
		case EElement::Metal: return TEXT("metal");
		case EElement::Wood:  return TEXT("wood");
		case EElement::Water: return TEXT("water");
		case EElement::Fire:  return TEXT("fire");
		case EElement::Earth: return TEXT("earth");
		case EElement::Light: return TEXT("light");
		case EElement::Dark:  return TEXT("dark");
		default: return TEXT("none");
		}
	}

	const TCHAR* ElementGlyph(EElement Element)
	{
		switch (Element)
		{
		case EElement::Metal: return TEXT("金");
		case EElement::Wood:  return TEXT("木");
		case EElement::Water: return TEXT("水");
		case EElement::Fire:  return TEXT("火");
		case EElement::Earth: return TEXT("土");
		case EElement::Light: return TEXT("光");
		case EElement::Dark:  return TEXT("暗");
		default: return TEXT("-");
		}
	}

	const TCHAR* ElementGlyphEn(EElement Element)
	{
		switch (Element)
		{
		case EElement::Metal: return TEXT("Metal");
		case EElement::Wood:  return TEXT("Wood");
		case EElement::Water: return TEXT("Water");
		case EElement::Fire:  return TEXT("Fire");
		case EElement::Earth: return TEXT("Earth");
		case EElement::Light: return TEXT("Light");
		case EElement::Dark:  return TEXT("Dark");
		default: return TEXT("None");
		}
	}

	const TCHAR* CardClassId(ECardClass Class)
	{
		switch (Class)
		{
		case ECardClass::Matter: return TEXT("matter");
		case ECardClass::Rite:   return TEXT("rite");
		case ECardClass::Law:    return TEXT("law");
		default: return TEXT("none");
		}
	}

	const TCHAR* CardClassGlyph(ECardClass Class)
	{
		switch (Class)
		{
		case ECardClass::Matter: return TEXT("物");
		case ECardClass::Rite:   return TEXT("术");
		case ECardClass::Law:    return TEXT("律");
		default: return TEXT("-");
		}
	}

	const TCHAR* DurationGlyph(EDuration Duration)
	{
		switch (Duration)
		{
		case EDuration::Instant:   return TEXT("瞬时");
		case EDuration::Sustain:   return TEXT("持续");
		case EDuration::Permanent: return TEXT("永久");
		case EDuration::Trigger:   return TEXT("触发");
		default: return TEXT("-");
		}
	}

	const TCHAR* WeatherGlyph(EWeather Weather)
	{
		switch (Weather)
		{
		case EWeather::Clear:     return TEXT("晴");
		case EWeather::Cloudy:    return TEXT("多云");
		case EWeather::LightRain: return TEXT("小雨");
		case EWeather::Storm:     return TEXT("暴雨");
		case EWeather::Fog:       return TEXT("雾");
		default: return TEXT("-");
		}
	}

	const TCHAR* BiomeGlyph(EBiome Biome)
	{
		switch (Biome)
		{
		case EBiome::Chaos:     return TEXT("混沌");
		case EBiome::Water:     return TEXT("水塘");
		case EBiome::Grass:     return TEXT("草原");
		case EBiome::Woodland:  return TEXT("林缘");
		case EBiome::RockSlope: return TEXT("岩坡");
		default: return TEXT("-");
		}
	}

	const TCHAR* MaterialGlyph(EMaterial Material)
	{
		switch (Material)
		{
		case EMaterial::Paper:     return TEXT("纸板");
		case EMaterial::Soil:      return TEXT("土");
		case EMaterial::Clay:      return TEXT("黏土");
		case EMaterial::Mud:       return TEXT("泥");
		case EMaterial::Stone:     return TEXT("石");
		case EMaterial::Ore:       return TEXT("矿");
		case EMaterial::DeadWood:  return TEXT("枯木");
		case EMaterial::LivePlant: return TEXT("活植被");
		case EMaterial::Water:     return TEXT("水");
		case EMaterial::Magma:     return TEXT("岩浆");
		case EMaterial::Ice:       return TEXT("冰");
		case EMaterial::Snow:      return TEXT("雪");
		case EMaterial::Sand:      return TEXT("沙");
		case EMaterial::Ash:       return TEXT("灰烬");
		case EMaterial::Tissue:    return TEXT("生物组织");
		default: return TEXT("-");
		}
	}

	const TCHAR* DeathCauseGlyph(EDeathCause Cause)
	{
		switch (Cause)
		{
		case EDeathCause::Starved:    return TEXT("饿死");
		case EDeathCause::Predated:   return TEXT("被捕食");
		case EDeathCause::Frozen:     return TEXT("冻死");
		case EDeathCause::Drowned:    return TEXT("淹死");
		case EDeathCause::Aged:       return TEXT("老死");
		case EDeathCause::Desiccated: return TEXT("脱水");
		default: return TEXT("-");
		}
	}

	const TCHAR* SpeciesId(ESpeciesKind Kind)
	{
		switch (Kind)
		{
		case ESpeciesKind::MossGrass:  return TEXT("sp.moss-grass");
		case ESpeciesKind::Shrub:      return TEXT("sp.shrub");
		case ESpeciesKind::Grazer:     return TEXT("sp.grazer");
		case ESpeciesKind::Raptor:     return TEXT("sp.raptor");
		case ESpeciesKind::StreamFish: return TEXT("sp.stream-fish");
		default: return TEXT("sp.unknown");
		}
	}

	const TCHAR* SpeciesGlyphZh(ESpeciesKind Kind)
	{
		switch (Kind)
		{
		case ESpeciesKind::MossGrass:  return TEXT("苔草");
		case ESpeciesKind::Shrub:      return TEXT("灌木");
		case ESpeciesKind::Grazer:     return TEXT("走兽");
		case ESpeciesKind::Raptor:     return TEXT("掠禽");
		case ESpeciesKind::StreamFish: return TEXT("溪鱼");
		default: return TEXT("?");
		}
	}

	// ------------------------------------------------------------------
	// Presentation colours (docs/art/ART-STYLE.md SS3.3 / SS3.4)
	// ------------------------------------------------------------------

	FLinearColor ElementColor(EElement Element)
	{
		switch (Element)
		{
		case EElement::Wood:  return FLinearColor::FromSRGBColor(FColor(0x6B, 0xA3, 0x4A));
		case EElement::Fire:  return FLinearColor::FromSRGBColor(FColor(0xE4, 0x57, 0x2E));
		case EElement::Earth: return FLinearColor::FromSRGBColor(FColor(0xB0, 0x7A, 0x45));
		case EElement::Water: return FLinearColor::FromSRGBColor(FColor(0x3B, 0x8E, 0xA5));
		case EElement::Metal: return FLinearColor::FromSRGBColor(FColor(0xC9, 0xA2, 0x27));
		case EElement::Light: return FLinearColor::FromSRGBColor(FColor(0xF2, 0xA3, 0x3C));
		case EElement::Dark:  return FLinearColor::FromSRGBColor(FColor(0x8E, 0x7C, 0xC3));
		default: return FLinearColor(0.6f, 0.6f, 0.6f);
		}
	}

	FLinearColor CardClassColor(ECardClass Class)
	{
		switch (Class)
		{
		case ECardClass::Matter: return FLinearColor::FromSRGBColor(FColor(0x93, 0x93, 0x98));	// 灰石
		case ECardClass::Rite:   return FLinearColor::FromSRGBColor(FColor(0x3A, 0x4E, 0x9E));	// 靛蓝
		case ECardClass::Law:    return FLinearColor::FromSRGBColor(FColor(0xA5, 0x52, 0x2E));	// 赭红
		default: return FLinearColor(0.5f, 0.5f, 0.5f);
		}
	}

	FLinearColor MaterialColor(EMaterial Material)
	{
		switch (Material)
		{
		case EMaterial::Paper:     return RawPaperColor();
		case EMaterial::Soil:      return FLinearColor::FromSRGBColor(FColor(0x6B, 0x4E, 0x33));
		case EMaterial::Clay:      return FLinearColor::FromSRGBColor(FColor(0x8A, 0x6A, 0x4B));
		case EMaterial::Mud:       return FLinearColor::FromSRGBColor(FColor(0x4A, 0x3B, 0x2A));
		case EMaterial::Stone:     return FLinearColor::FromSRGBColor(FColor(0x8A, 0x8C, 0x8E));
		case EMaterial::Ore:       return FLinearColor::FromSRGBColor(FColor(0xC9, 0xA2, 0x27));
		case EMaterial::DeadWood:  return FLinearColor::FromSRGBColor(FColor(0x6E, 0x5A, 0x3E));
		case EMaterial::LivePlant: return FLinearColor::FromSRGBColor(FColor(0x5E, 0x8C, 0x3F));
		case EMaterial::Water:     return FLinearColor::FromSRGBColor(FColor(0x2F, 0x6F, 0x8F));
		case EMaterial::Magma:     return FLinearColor::FromSRGBColor(FColor(0xFF, 0x5A, 0x1E));
		case EMaterial::Ice:       return FLinearColor::FromSRGBColor(FColor(0xA9, 0xD2, 0xE8));
		case EMaterial::Snow:      return FLinearColor::FromSRGBColor(FColor(0xF2, 0xF6, 0xFA));
		case EMaterial::Sand:      return FLinearColor::FromSRGBColor(FColor(0xD8, 0xC0, 0x8A));
		case EMaterial::Ash:       return FLinearColor::FromSRGBColor(FColor(0x4A, 0x47, 0x44));
		case EMaterial::Tissue:    return FLinearColor::FromSRGBColor(FColor(0xB5, 0x95, 0x7A));
		default: return RawPaperColor();
		}
	}

	FLinearColor RawPaperColor()
	{
		// 灰白纸板原色 - the "uncoloured paper" of the chaos state.
		return FLinearColor::FromSRGBColor(FColor(0xED, 0xE6, 0xD6));
	}

	FLinearColor KraftPaperColor()
	{
		// 牛皮纸色 - the second paper tone, used for plate sides and the dome shell.
		return FLinearColor::FromSRGBColor(FColor(0xC9, 0xA9, 0x7C));
	}

	FString TierLabel(int32 Tier)
	{
		if (Tier == 10)
		{
			return TEXT("over");
		}
		if (Tier == 11)
		{
			return TEXT("ban");
		}
		return FString::Printf(TEXT("%d"), Tier);
	}

	// ------------------------------------------------------------------
	// Catalogue lookups
	// ------------------------------------------------------------------

	int32 FCatalog::FindCard(const FName& Id) const
	{
		for (int32 Index = 0; Index < Cards.Num(); ++Index)
		{
			if (Cards[Index].Id == Id)
			{
				return Index;
			}
		}
		return INDEX_NONE;
	}

	int32 FCatalog::FindSpecies(uint8 Kind) const
	{
		for (int32 Index = 0; Index < Species.Num(); ++Index)
		{
			if (Species[Index].Kind == Kind)
			{
				return Index;
			}
		}
		return INDEX_NONE;
	}

	const FCardDef* FCatalog::CardAt(int32 Index) const
	{
		return Cards.IsValidIndex(Index) ? &Cards[Index] : nullptr;
	}
}

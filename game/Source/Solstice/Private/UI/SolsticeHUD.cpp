// Solstice - UI layer: the Slate HUD.

#include "UI/SolsticeHUD.h"

#include "Brushes/SlateColorBrush.h"
#include "Brushes/SlateRoundedBoxBrush.h"
#include "Core/SolsticeGameInstance.h"
#include "Core/SolsticeLocalization.h"
#include "God/SolsticePlayerController.h"
#include "Sim/SolsticeKernel.h"
#include "Styling/CoreStyle.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/Layout/SSpacer.h"
#include "Widgets/Notifications/SProgressBar.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/SNullWidget.h"
#include "Widgets/SOverlay.h"
#include "Widgets/Text/STextBlock.h"

using namespace Solstice;

namespace
{
	// ---- the paper chrome palette -------------------------------------------------
	const FLinearColor PanelBg(0.960f, 0.944f, 0.910f, 0.92f);
	const FLinearColor PanelBgDeep(0.930f, 0.906f, 0.860f, 0.95f);
	const FLinearColor PanelEdge(0.44f, 0.39f, 0.32f, 0.90f);
	const FLinearColor Ink(0.155f, 0.135f, 0.115f, 1.0f);
	const FLinearColor InkSoft(0.400f, 0.355f, 0.305f, 1.0f);
	const FLinearColor Accent(0.780f, 0.360f, 0.120f, 1.0f);

	const FSlateBrush* WhiteBrush()
	{
		static const FSlateColorBrush Brush(FLinearColor::White);
		return &Brush;
	}

	// Chips float on coloured surfaces (hand cards), so they stay translucent white and only
	// gain a hairline ink outline. Hover darkens the outline, not the fill.
	const FButtonStyle& ChipStyle()
	{
		static const FButtonStyle Style = FButtonStyle()
			.SetNormal(FSlateRoundedBoxBrush(FLinearColor(1.0f, 1.0f, 1.0f, 0.35f), 3.0f, FLinearColor(0.44f, 0.39f, 0.32f, 0.30f), 1.0f))
			.SetHovered(FSlateRoundedBoxBrush(FLinearColor(1.0f, 1.0f, 1.0f, 0.75f), 3.0f, FLinearColor(0.44f, 0.39f, 0.32f, 0.70f), 1.0f))
			.SetPressed(FSlateRoundedBoxBrush(FLinearColor(1.0f, 1.0f, 1.0f, 0.95f), 3.0f, FLinearColor(0.44f, 0.39f, 0.32f, 0.90f), 1.0f))
			.SetNormalPadding(FMargin(1.0f))
			.SetPressedPadding(FMargin(1.0f));
		return Style;
	}

	// Action buttons are cut-paper tiles: solid warm fill, brown edge, hover lifts toward full
	// paper white, press sinks to the deep panel tone with an ochre edge.
	const FButtonStyle& ActionStyle()
	{
		static const FButtonStyle Style = FButtonStyle()
			.SetNormal(FSlateRoundedBoxBrush(PanelBg, 3.0f, FLinearColor(0.44f, 0.39f, 0.32f, 0.80f), 1.0f))
			.SetHovered(FSlateRoundedBoxBrush(FLinearColor(0.990f, 0.975f, 0.945f, 1.0f), 3.0f, FLinearColor(0.44f, 0.39f, 0.32f, 1.0f), 1.0f))
			.SetPressed(FSlateRoundedBoxBrush(PanelBgDeep, 3.0f, FLinearColor(0.780f, 0.360f, 0.120f, 1.0f), 1.0f))
			.SetNormalPadding(FMargin(11.0f, 5.0f))
			.SetPressedPadding(FMargin(11.0f, 6.0f));
		return Style;
	}

	FSlateFontInfo Font(int32 Size, bool bBold = false)
	{
		return FCoreStyle::GetDefaultFontStyle(bBold ? TEXT("Bold") : TEXT("Regular"), Size);
	}

	FText Tx(const FString& In) { return FText::FromString(In); }
	FText Num(int32 In) { return FText::FromString(FString::FromInt(In)); }
	FText Dec1(float In) { return FText::FromString(FString::Printf(TEXT("%.1f"), In)); }
	FText Percent(float In) { return FText::FromString(FString::Printf(TEXT("%d%%"), FMath::RoundToInt(In * 100.0f))); }

	TSharedRef<STextBlock> Txt(const FText& Text, int32 Size = 12, const FLinearColor& Colour = Ink, bool bBold = false)
	{
		return SNew(STextBlock)
			.Text(Text)
			.Font(Font(Size, bBold))
			.ColorAndOpacity(FSlateColor(Colour))
			.Visibility(EVisibility::HitTestInvisible);
	}

	TSharedRef<STextBlock> TxtL(TAttribute<FText> Text, int32 Size = 12, const FLinearColor& Colour = Ink, bool bBold = false)
	{
		return SNew(STextBlock)
			.Text(Text)
			.Font(Font(Size, bBold))
			.ColorAndOpacity(FSlateColor(Colour))
			.Visibility(EVisibility::HitTestInvisible);
	}

	/** Key on the left in soft ink, live value on the right in full ink. */
	TSharedRef<SWidget> Row(const FString& Key, TAttribute<FText> Value)
	{
		return SNew(SHorizontalBox)
			+ SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Center).Padding(0.0f, 1.0f)
			[
				Txt(Tx(Loc(Key)), 12, InkSoft)
			]
			+ SHorizontalBox::Slot().FillWidth(1.0f)
			[
				SNullWidget::NullWidget
			]
			+ SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Center).Padding(10.0f, 1.0f)
			[
				TxtL(Value, 12, Ink, true)
			];
	}

	/** A titled parchment panel. Everything inside is hit-test invisible. */
	TSharedRef<SWidget> Panel(const FText& Title, TSharedRef<SWidget> Body, float Width)
	{
		return SNew(SBox)
			.WidthOverride(Width)
			[
				SNew(SBorder)
				.BorderImage(WhiteBrush())
				.BorderBackgroundColor(FSlateColor(PanelBg))
				.Padding(FMargin(11.0f, 8.0f))
				.Visibility(EVisibility::SelfHitTestInvisible)
				[
					SNew(SVerticalBox)
					+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 0.0f, 0.0f, 5.0f)
					[
						Txt(Title, 13, Accent, true)
					]
					+ SVerticalBox::Slot().AutoHeight()
					[
						Body
					]
				]
			];
	}

	TSharedRef<SWidget> ActionButton(const FText& Label, FOnClicked OnClicked)
	{
		return SNew(SButton)
			.ButtonStyle(&ActionStyle())
			.OnClicked(OnClicked)
			.ContentPadding(FMargin(2.0f))
			[
				Txt(Label, 12, Ink, true)
			];
	}

	TSharedRef<SWidget> SmallButton(const FText& Label, FOnClicked OnClicked)
	{
		return SNew(SButton)
			.ButtonStyle(&ChipStyle())
			.OnClicked(OnClicked)
			.ContentPadding(FMargin(2.0f))
			[
				Txt(Label, 11, Ink, false)
			];
	}
}

FVector2D SSolsticeHUD::ComputeDesiredSize(float) const
{
	return FVector2D::ZeroVector;
}

USolsticeGameInstance* SSolsticeHUD::GI() const
{
	ASolsticePlayerController* PlayerCtl = PC();
	return PlayerCtl ? PlayerCtl->Game() : nullptr;
}

FSimKernel* SSolsticeHUD::Sim() const
{
	USolsticeGameInstance* Instance = GI();
	return Instance ? &Instance->Kernel() : nullptr;
}

void SSolsticeHUD::Construct(const FArguments& InArgs)
{
	Controller = InArgs._Controller;

	ChildSlot
	[
		SNew(SOverlay)
		// The whole HUD collapses when the controller has hidden the UI (Tab), so screenshots
		// and inspection see the bare paper world.
		.Visibility(TAttribute<EVisibility>::CreateLambda([this]()
		{
			ASolsticePlayerController* PlayerCtl = PC();
			return (!PlayerCtl || PlayerCtl->IsUIOpen()) ? EVisibility::SelfHitTestInvisible : EVisibility::Collapsed;
		}))

		// ---- top left: clock -------------------------------------------------
		+ SOverlay::Slot().HAlign(HAlign_Left).VAlign(VAlign_Top).Padding(FMargin(14.0f))
		[
			SNew(SVerticalBox)
			+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 0.0f, 0.0f, 6.0f)
			[
				BuildClockPanel()
			]
			+ SVerticalBox::Slot().AutoHeight()
			[
				BuildRealmPanel()
			]
		]

		// ---- top right: echo -------------------------------------------------
		+ SOverlay::Slot().HAlign(HAlign_Right).VAlign(VAlign_Top).Padding(FMargin(14.0f))
		[
			SNew(SVerticalBox)
			+ SVerticalBox::Slot().AutoHeight()
			[
				BuildEchoPanel()
			]
			+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 6.0f, 0.0f, 0.0f)
			[
				BuildPackPanel()
			]
			+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 6.0f, 0.0f, 0.0f)
			[
				BuildChroniclePanel()
			]
			+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 6.0f, 0.0f, 0.0f)
			[
				BuildPoolPanel()
			]
			+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 6.0f, 0.0f, 0.0f)
			[
				BuildCreatorPanel()
			]
		]

		// ---- top centre: status ---------------------------------------------
		+ SOverlay::Slot().HAlign(HAlign_Center).VAlign(VAlign_Top).Padding(FMargin(14.0f, 18.0f))
		[
			BuildStatusLine()
		]

		// ---- bottom centre: hand + actions ----------------------------------
		+ SOverlay::Slot().HAlign(HAlign_Center).VAlign(VAlign_Bottom).Padding(FMargin(14.0f))
		[
			SNew(SVerticalBox)
			+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 0.0f, 0.0f, 6.0f)
			[
				BuildHandBar()
			]
			+ SVerticalBox::Slot().AutoHeight()
			[
				BuildActionBar()
			]
		]

		// ---- bottom left: controls ------------------------------------------
		+ SOverlay::Slot().HAlign(HAlign_Left).VAlign(VAlign_Bottom).Padding(FMargin(14.0f))
		[
			BuildHelpPanel()
		]
	];
}

// ======================================================================
// Panels
// ======================================================================

TSharedRef<SWidget> SSolsticeHUD::BuildClockPanel()
{
	TSharedRef<SVerticalBox> Body = SNew(SVerticalBox);

	Body->AddSlot().AutoHeight()[ Row(TEXT("game.realm"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? FText::FromString(Solstice::Loc2(Kernel->GetConfig().RealmNameZh, Kernel->GetConfig().RealmNameEn)) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("time.clock"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? FText::FromString(Kernel->GetClockString()) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("time.real_date"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? FText::FromString(Kernel->GetRealDateString()) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("time.season"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? FText::FromString(Kernel->GetSeasonString()) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("time.mode"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		if (!Kernel) { return FText::GetEmpty(); }
		const bool bReal = Kernel->GetTimeMode() == ETimeMode::Real;
		const FString Mode = bReal ? Solstice::Loc(TEXT("time.real")) : Solstice::Loc(TEXT("time.virtual"));
		const FString State = Kernel->IsPaused() ? Solstice::Loc(TEXT("time.paused")) : Solstice::Loc(TEXT("time.running"));
		if (bReal)
		{
			return FText::FromString(FString::Printf(TEXT("%s · %s"), *Mode, *State));
		}
		const int32 SpeedIndex = Kernel->GetSpeedIndex();
		const FString Speed = SpeedIndex >= 2 ? FString::Printf(TEXT("%s x%d"), *State, SpeedIndex == 3 ? 20 : 4) : State;
		return FText::FromString(FString::Printf(TEXT("%s · %s"), *Mode, *Speed));
	})) ];

	Body->AddSlot().AutoHeight().Padding(0.0f, 4.0f, 0.0f, 0.0f)[ Row(TEXT("sky.weather"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		if (!Kernel) { return FText::GetEmpty(); }
		const FSkyState& Sky = Kernel->GetSky();
		const FString Glyph = Solstice::Loc(FString::Printf(TEXT("weather.%s"),
			Sky.GetWeather() == EWeather::Clear ? TEXT("clear") :
			Sky.GetWeather() == EWeather::Cloudy ? TEXT("cloudy") :
			Sky.GetWeather() == EWeather::LightRain ? TEXT("light_rain") :
			Sky.GetWeather() == EWeather::Storm ? TEXT("storm") : TEXT("fog")));
		return FText::FromString(Sky.bSnowing ? FString::Printf(TEXT("%s / %s"), *Glyph, *Solstice::Loc(TEXT("sky.snowing"))) : Glyph);
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("sky.temperature"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Tx(FString::Printf(TEXT("%.1f °C"), Kernel->GetSky().AirTempC)) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("sky.humidity"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Percent(Kernel->GetSky().Humidity) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("sky.wind"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Tx(FString::Printf(TEXT("%.1f m/s · %d°"), Kernel->GetSky().WindSpeed, FMath::RoundToInt(Kernel->GetSky().WindDirDeg))) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("sky.water_level"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Dec1(Kernel->GetSky().WaterLevel) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("sky.city"), TAttribute<FText>::CreateLambda([this]()
	{
		USolsticeGameInstance* Instance = GI();
		if (!Instance) { return FText::GetEmpty(); }
		const bool bOnline = Instance->Anchor().IsWeatherFromNetwork();
		return Tx(FString::Printf(TEXT("%s · %s"), *Instance->Anchor().GetCityName(),
			*Solstice::Loc(bOnline ? TEXT("sky.reality_online") : TEXT("sky.reality_offline"))));
	})) ];

	return Panel(Tx(Solstice::Loc(TEXT("time.mode"))), Body, 244.0f);
}

TSharedRef<SWidget> SSolsticeHUD::BuildRealmPanel()
{
	TSharedRef<SVerticalBox> Body = SNew(SVerticalBox);

	Body->AddSlot().AutoHeight()[ Row(TEXT("realm.population_total"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Num(Kernel->GetPopulationTotal()) : FText::GetEmpty();
	})) ];

	for (int32 Kind = 0; Kind < static_cast<int32>(ESpeciesKind::Count); ++Kind)
	{
		const ESpeciesKind Species = static_cast<ESpeciesKind>(Kind);
		const FString Key = FString::Printf(TEXT("species.%s"), Solstice::SpeciesId(Species));
		Body->AddSlot().AutoHeight().Padding(12.0f, 0.0f, 0.0f, 0.0f)[ Row(Key, TAttribute<FText>::CreateLambda([this, Species]()
		{
			FSimKernel* Kernel = Sim();
			return Kernel ? Num(Kernel->GetPopulation(Species)) : FText::GetEmpty();
		})) ];
	}

	Body->AddSlot().AutoHeight().Padding(0.0f, 4.0f, 0.0f, 0.0f)[ Row(TEXT("realm.vegetation"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Percent(Kernel->GetVegetationMean()) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("realm.fertility"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Percent(Kernel->GetFertilityMean()) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("realm.biomass"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Percent(Kernel->GetBiomassNorm()) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("realm.diversity"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Percent(Kernel->GetDiversityIndex()) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("realm.stability"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Percent(Kernel->GetStabilityIndex()) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("realm.potential"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Dec1(Kernel->GetEcoPotential()) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("realm.painted"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		if (!Kernel) { return FText::GetEmpty(); }
		const FString State = Kernel->IsChaos() ? Solstice::Loc(TEXT("realm.chaos")) : Solstice::Loc(TEXT("realm.alive"));
		return Tx(FString::Printf(TEXT("%s · %s"), *Percent(Kernel->GetPaintedFraction()).ToString(), *State));
	})) ];

	return Panel(Tx(Solstice::Loc(TEXT("game.title"))), Body, 244.0f);
}

TSharedRef<SWidget> SSolsticeHUD::BuildEchoPanel()
{
	TSharedRef<SVerticalBox> Body = SNew(SVerticalBox);

	Body->AddSlot().AutoHeight()
	[
		SNew(SHorizontalBox)
		+ SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Center)
		[
			TxtL(TAttribute<FText>::CreateLambda([this]()
			{
				FSimKernel* Kernel = Sim();
				return Kernel ? Num(Kernel->GetEcho()) : Num(0);
			}), 22, Ink, true)
		]
		+ SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Bottom).Padding(8.0f, 0.0f, 0.0f, 3.0f)
		[
			Txt(Tx(Solstice::Loc(TEXT("echo.balance"))), 12, InkSoft)
		]
	];

	Body->AddSlot().AutoHeight()[ Row(TEXT("echo.from_event"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Num(Kernel->GetLedger().FromEvent) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("echo.from_sediment"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Num(Kernel->GetLedger().FromSediment) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("echo.from_firsthand"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Num(Kernel->GetLedger().FromFirsthand) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("echo.from_recycle"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Num(Kernel->GetLedger().FromRecycle + Kernel->GetLedger().FromAutoConvert) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight()[ Row(TEXT("echo.per_minute"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		return Kernel ? Tx(FString::Printf(TEXT("%d / %d"), Kernel->GetEventEchoThisMinute(), Tuning::EchoPerMinuteCap)) : FText::GetEmpty();
	})) ];
	Body->AddSlot().AutoHeight().Padding(0.0f, 4.0f, 0.0f, 2.0f)[ Row(TEXT("echo.disturbance"), TAttribute<FText>::CreateLambda([this]()
	{
		FSimKernel* Kernel = Sim();
		if (!Kernel) { return FText::GetEmpty(); }
		return Tx(FString::Printf(TEXT("%d%%"), FMath::RoundToInt(Kernel->GetDisturbance())));
	})) ];
	Body->AddSlot().AutoHeight().Padding(0.0f, 0.0f, 0.0f, 2.0f)
	[
		SNew(SProgressBar)
		.Percent(TAttribute<TOptional<float>>::CreateLambda([this]()
		{
			FSimKernel* Kernel = Sim();
			return TOptional<float>(Kernel ? FMath::Clamp(Kernel->GetDisturbance() / 100.0f, 0.0f, 1.0f) : 0.0f);
		}))
		.FillColorAndOpacity(FLinearColor(0.78f, 0.36f, 0.12f, 0.9f))
	];
	Body->AddSlot().AutoHeight()
	[
		TxtL(TAttribute<FText>::CreateLambda([this]()
		{
			FSimKernel* Kernel = Sim();
			if (!Kernel || Kernel->GetDisturbance() < Tuning::DisturbancePenaltyThreshold)
			{
				return FText::GetEmpty();
			}
			return Tx(Solstice::Loc(TEXT("echo.disturbance_high")));
		}), 11, Accent)
	];

	// Calming is the only echo sink besides packs, so it lives next to the meter it drains.
	Body->AddSlot().AutoHeight().Padding(0.0f, 6.0f, 0.0f, 0.0f)
	[
		SNew(SHorizontalBox)
		+ SHorizontalBox::Slot().AutoWidth().Padding(0.0f, 0.0f, 4.0f, 0.0f)
		[
			SmallButton(Tx(Solstice::Loc(TEXT("calm.one"))), FOnClicked::CreateLambda([this]()
			{
				if (ASolsticePlayerController* Controller = PC()) { Controller->CalmDisturbance(1); }
				return FReply::Handled();
			}))
		]
		+ SHorizontalBox::Slot().AutoWidth()
		[
			SmallButton(Tx(Solstice::Loc(TEXT("calm.two"))), FOnClicked::CreateLambda([this]()
			{
				if (ASolsticePlayerController* Controller = PC()) { Controller->CalmDisturbance(2); }
				return FReply::Handled();
			}))
		]
	];

	return Panel(Tx(Solstice::Loc(TEXT("echo.balance"))), Body, 244.0f);
}

TSharedRef<SWidget> SSolsticeHUD::BuildStatusLine()
{
	return SNew(SBorder)
		.BorderImage(WhiteBrush())
		.BorderBackgroundColor(FSlateColor(PanelBgDeep))
		.Padding(FMargin(14.0f, 6.0f))
		.Visibility(EVisibility::HitTestInvisible)
		[
			TxtL(TAttribute<FText>::CreateLambda([this]()
			{
				ASolsticePlayerController* Controller = PC();
				if (!Controller || !Controller->HasStatus())
				{
					return FText::GetEmpty();
				}
				return FText::FromString(Solstice::Loc2(Controller->GetStatusZh(), Controller->GetStatusEn()));
			}), 12, Ink, true)
		];
}

TSharedRef<SWidget> SSolsticeHUD::CardChip(int32 Slot)
{
	return SNew(SBox)
		.WidthOverride(96.0f)
		.HeightOverride(58.0f)
		.Padding(FMargin(3.0f))
		[
			SNew(SBorder)
			.BorderImage(WhiteBrush())
			.BorderBackgroundColor(TAttribute<FSlateColor>::CreateLambda([this, Slot]()
			{
				ASolsticePlayerController* Controller = PC();
				const bool bSelected = Controller && Controller->GetSelectedSlot() == Slot;
				FSimKernel* Kernel = Sim();
				const int32 CardIndex = Kernel ? Kernel->GetHandCardIndex(Slot) : INDEX_NONE;
				if (CardIndex == INDEX_NONE)
				{
					return FSlateColor(FLinearColor(0.85f, 0.84f, 0.80f, 0.45f));
				}
				const FCardDef* Card = Kernel->GetCatalog().CardAt(CardIndex);
				FLinearColor Tint = Card ? Solstice::ElementColor(Card->GetElement()) : FLinearColor::White;
				Tint.A = bSelected ? 0.95f : 0.55f;
				if (Card && Card->Tier == 0)
				{
					Tint = FMath::Lerp(FLinearColor(0.96f, 0.94f, 0.90f), Tint, 0.45f);
					Tint.A = bSelected ? 0.95f : 0.60f;
				}
				return FSlateColor(Tint);
			}))
			.Padding(FMargin(6.0f, 4.0f))
			[
				SNew(SButton)
				.ButtonStyle(&ChipStyle())
				.ContentPadding(FMargin(0.0f))
				.OnClicked(FOnClicked::CreateLambda([this, Slot]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->SelectSlot(Slot); }
					return FReply::Handled();
				}))
				[
					SNew(SVerticalBox)
					+ SVerticalBox::Slot().AutoHeight()
					[
						TxtL(TAttribute<FText>::CreateLambda([this, Slot]()
						{
							FSimKernel* Kernel = Sim();
							const int32 CardIndex = Kernel ? Kernel->GetHandCardIndex(Slot) : INDEX_NONE;
							if (CardIndex == INDEX_NONE) { return Tx(Solstice::Loc(TEXT("hand.empty"))); }
							const FCardDef* Card = Kernel->GetCatalog().CardAt(CardIndex);
							if (!Card) { return FText::GetEmpty(); }
							const FString ElementKey = FString::Printf(TEXT("element.%s"),
								Solstice::ElementId(Card->GetElement()));
							return Tx(FString::Printf(TEXT("%s · %s"), *Solstice::Loc(ElementKey), *Solstice::TierLabel(Card->Tier)));
						}), 10, Ink, true)
					]
					+ SVerticalBox::Slot().AutoHeight()
					[
						TxtL(TAttribute<FText>::CreateLambda([this, Slot]()
						{
							FSimKernel* Kernel = Sim();
							const int32 CardIndex = Kernel ? Kernel->GetHandCardIndex(Slot) : INDEX_NONE;
							if (CardIndex == INDEX_NONE) { return FText::GetEmpty(); }
							const FCardDef* Card = Kernel->GetCatalog().CardAt(CardIndex);
							return Card ? FText::FromString(Solstice::Loc2(Card->NameZh, Card->NameEn)) : FText::GetEmpty();
						}), 11, Ink)
					]
					+ SVerticalBox::Slot().AutoHeight()
					[
						TxtL(TAttribute<FText>::CreateLambda([this, Slot]()
						{
							FSimKernel* Kernel = Sim();
							const int32 CardIndex = Kernel ? Kernel->GetHandCardIndex(Slot) : INDEX_NONE;
							if (CardIndex == INDEX_NONE) { return FText::GetEmpty(); }
							const FCardDef* Card = Kernel->GetCatalog().CardAt(CardIndex);
							if (!Card) { return FText::GetEmpty(); }
							return Tx(FString::Printf(TEXT("%s · %s · %s"),
								*Solstice::Loc(FString::Printf(TEXT("class.%s"), Solstice::CardClassId(Card->GetCardClass()))),
								Solstice::DurationGlyph(Card->GetDuration()),
								*FString::FromInt(Solstice::Tuning::CardValue[FMath::Clamp(static_cast<int32>(Card->Tier), 0, 11)])));
						}), 9, InkSoft)
					]
				]
			]
		];
}

TSharedRef<SWidget> SSolsticeHUD::BuildHandBar()
{
	TSharedRef<SHorizontalBox> HandRow = SNew(SHorizontalBox);
	for (int32 Slot = 0; Slot < Solstice::Tuning::HandSize; ++Slot)
	{
		HandRow->AddSlot().AutoWidth()[ CardChip(Slot) ];
	}

	return SNew(SBorder)
		.BorderImage(WhiteBrush())
		.BorderBackgroundColor(FSlateColor(PanelBg))
		.Padding(FMargin(8.0f, 6.0f))
		.Visibility(EVisibility::SelfHitTestInvisible)
		[
			SNew(SVerticalBox)
			+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 0.0f, 0.0f, 4.0f)
			[
				SNew(SHorizontalBox)
				+ SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Center)
				[
					Txt(Tx(Solstice::Loc(TEXT("hand.title"))), 12, Accent, true)
				]
				+ SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Center).Padding(14.0f, 0.0f, 0.0f, 0.0f)
				[
					TxtL(TAttribute<FText>::CreateLambda([this]()
					{
						ASolsticePlayerController* Controller = PC();
						FSimKernel* Kernel = Sim();
						if (!Controller || !Kernel) { return FText::GetEmpty(); }
						const FString Mode = Controller->IsSettleAsEntity()
							? Solstice::Loc(TEXT("hand.settle"))
							: Solstice::Loc(TEXT("hand.release"));
						return Tx(FString::Printf(TEXT("[%s] %s · %s"),
							*FString::FromInt(Controller->GetSelectedSlot() + 1),
							*Mode,
							*Solstice::Loc(TEXT("hand.undo_window"))));
					}), 11, InkSoft)
				]
				+ SHorizontalBox::Slot().FillWidth(1.0f)[ SNullWidget::NullWidget ]
			]
			+ SVerticalBox::Slot().AutoHeight()
			[
				HandRow
			]
		];
}

TSharedRef<SWidget> SSolsticeHUD::BuildActionBar()
{
	return SNew(SBorder)
		.BorderImage(WhiteBrush())
		.BorderBackgroundColor(FSlateColor(PanelBgDeep))
		.Padding(FMargin(10.0f, 6.0f))
		.Visibility(EVisibility::SelfHitTestInvisible)
		[
			SNew(SHorizontalBox)
			+ SHorizontalBox::Slot().AutoWidth().Padding(2.0f)
			[
				ActionButton(Tx(Solstice::Loc(TEXT("hand.release"))), FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->ReleaseSelectedAtCursor(); }
					return FReply::Handled();
				}))
			]
			+ SHorizontalBox::Slot().AutoWidth().Padding(2.0f)
			[
				ActionButton(Tx(Solstice::Loc(TEXT("hand.recycle"))), FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->RecycleSelected(); }
					return FReply::Handled();
				}))
			]
			+ SHorizontalBox::Slot().AutoWidth().Padding(2.0f)
			[
				ActionButton(Tx(Solstice::Loc(TEXT("hand.undo"))), FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->UndoRelease(); }
					return FReply::Handled();
				}))
			]
			+ SHorizontalBox::Slot().AutoWidth().Padding(2.0f)
			[
				ActionButton(Tx(Solstice::Loc(TEXT("hand.reroll"))), FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->RerollHand(); }
					return FReply::Handled();
				}))
			]
			+ SHorizontalBox::Slot().AutoWidth().Padding(10.0f, 2.0f, 2.0f, 2.0f)
			[
				ActionButton(Tx(Solstice::Loc(TEXT("time.virtual"))), FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->ToggleTimeMode(); }
					return FReply::Handled();
				}))
			]
			+ SHorizontalBox::Slot().AutoWidth().Padding(2.0f)
			[
				ActionButton(Tx(TEXT("||")), FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->TogglePause(); }
					return FReply::Handled();
				}))
			]
			+ SHorizontalBox::Slot().AutoWidth().Padding(2.0f)
			[
				ActionButton(Tx(TEXT(">>")), FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->CycleSpeed(); }
					return FReply::Handled();
				}))
			]
			+ SHorizontalBox::Slot().AutoWidth().Padding(10.0f, 2.0f, 2.0f, 2.0f)
			[
				ActionButton(Tx(TEXT("中/EN")), FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->ToggleLanguage(); }
					return FReply::Handled();
				}))
			]
		];
}

TSharedRef<SWidget> SSolsticeHUD::BuildPackPanel()
{
	TSharedRef<SVerticalBox> Body = SNew(SVerticalBox);

	Body->AddSlot().AutoHeight()
	[
		SNew(SHorizontalBox)
		+ SHorizontalBox::Slot().AutoWidth().Padding(0.0f, 0.0f, 4.0f, 0.0f)
		[
			SmallButton(Tx(FString::Printf(TEXT("%s %d"), *Solstice::Loc(TEXT("pack.random")), Tuning::PackPriceRandom)),
				FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->OpenPack(EPackKind::RandomElement); }
					return FReply::Handled();
				}))
		]
		+ SHorizontalBox::Slot().AutoWidth()
		[
			SmallButton(Tx(FString::Printf(TEXT("%s %d"), *Solstice::Loc(TEXT("pack.special")), Tuning::PackPriceSpecial)),
				FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->OpenPack(EPackKind::Special); }
					return FReply::Handled();
				}))
		]
	];

	// Three element packs, priced at the chosen-element tariff.
	Body->AddSlot().AutoHeight().Padding(0.0f, 4.0f, 0.0f, 0.0f)
	[
		SNew(SHorizontalBox)
		+ SHorizontalBox::Slot().AutoWidth().Padding(0.0f, 0.0f, 4.0f, 0.0f)
		[
			SmallButton(Tx(FString::Printf(TEXT("%s %d"), Solstice::ElementGlyph(EElement::Earth), Tuning::PackPriceSpecific)),
				FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->OpenPackForElement(EElement::Earth); }
					return FReply::Handled();
				}))
		]
		+ SHorizontalBox::Slot().AutoWidth().Padding(0.0f, 0.0f, 4.0f, 0.0f)
		[
			SmallButton(Tx(FString::Printf(TEXT("%s %d"), Solstice::ElementGlyph(EElement::Fire), Tuning::PackPriceSpecific)),
				FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->OpenPackForElement(EElement::Fire); }
					return FReply::Handled();
				}))
		]
		+ SHorizontalBox::Slot().AutoWidth()
		[
			SmallButton(Tx(FString::Printf(TEXT("%s %d"), Solstice::ElementGlyph(EElement::Metal), Tuning::PackPriceSpecific)),
				FOnClicked::CreateLambda([this]()
				{
					if (ASolsticePlayerController* Controller = PC()) { Controller->OpenPackForElement(EElement::Metal); }
					return FReply::Handled();
				}))
		]
	];

	Body->AddSlot().AutoHeight().Padding(0.0f, 6.0f, 0.0f, 0.0f)
	[
		TxtL(TAttribute<FText>::CreateLambda([this]()
		{
			ASolsticePlayerController* Controller = PC();
			if (!Controller) { return FText::GetEmpty(); }
			const FPackResult& Result = Controller->GetLastPack();
			if (Result.Cards.Num() == 0) { return FText::GetEmpty(); }

			FSimKernel* Kernel = Sim();
			FString Built = FString::Printf(TEXT("%s: "), *Solstice::Loc(TEXT("pack.result")));
			for (int32 Index = 0; Index < Result.Cards.Num(); ++Index)
			{
				const FCardDef* Card = Kernel ? Kernel->GetCatalog().CardAt(Result.Cards[Index]) : nullptr;
				if (!Card) { continue; }
				Built += FString::Printf(TEXT("%s%s "), Index > 0 ? TEXT("· ") : TEXT(""),
					*Solstice::Loc2(Card->NameZh, Card->NameEn));
			}
			if (Result.ConvertedEcho > 0)
			{
				Built += FString::Printf(TEXT("\n%s (+%d)"), *Solstice::Loc(TEXT("pack.converted")), Result.ConvertedEcho);
			}
			return Tx(Built);
		}), 11, Ink)
	];

	Body->AddSlot().AutoHeight()
	[
		TxtL(TAttribute<FText>::CreateLambda([this]()
		{
			FSimKernel* Kernel = Sim();
			if (!Kernel || Kernel->AreSpecialPacksAvailable()) { return FText::GetEmpty(); }
			return Tx(Solstice::Loc(TEXT("pack.special_locked")));
		}), 10, InkSoft)
	];

	return SNew(SBox)
		.WidthOverride(244.0f)
		.Visibility(EVisibility::SelfHitTestInvisible)
		[
			SNew(SBorder)
			.BorderImage(WhiteBrush())
			.BorderBackgroundColor(FSlateColor(PanelBg))
			.Padding(FMargin(11.0f, 8.0f))
			[
				SNew(SVerticalBox)
				+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 0.0f, 0.0f, 5.0f)
				[
					SNew(SHorizontalBox)
					+ SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Center)
					[
						Txt(Tx(Solstice::Loc(TEXT("pack.title"))), 13, Accent, true)
					]
					+ SHorizontalBox::Slot().FillWidth(1.0f)[ SNullWidget::NullWidget ]
				]
				+ SVerticalBox::Slot().AutoHeight()[ Body ]
			]
		];
}

TSharedRef<SWidget> SSolsticeHUD::BuildChroniclePanel()
{
	TSharedRef<SBox> Body = SNew(SBox).HeightOverride(190.0f)
	[
		SNew(SScrollBox)
		+ SScrollBox::Slot()
		[
			TxtL(TAttribute<FText>::CreateLambda([this]()
			{
				FSimKernel* Kernel = Sim();
				if (!Kernel) { return FText::GetEmpty(); }
				const TArray<FChronicleEntry>& Entries = Kernel->GetChronicle();
				if (Entries.Num() == 0) { return Tx(Solstice::Loc(TEXT("chronicle.empty"))); }

				FString Built;
				const int32 Shown = FMath::Min(Entries.Num(), 60);
				for (int32 Index = 0; Index < Shown; ++Index)
				{
					const FChronicleEntry& Entry = Entries[Entries.Num() - 1 - Index];
					Built += FString::Printf(TEXT("%d 日 %02d:%02d  %s\n"),
						Entry.WorldDay, Entry.MinuteOfDay / 60, Entry.MinuteOfDay % 60,
						*Solstice::Loc2(Entry.SummaryZh, Entry.SummaryEn));
				}
				return Tx(Built);
			}), 10, Ink)
		]
	];

	return SNew(SBox)
		.WidthOverride(300.0f)
		.Visibility(EVisibility::SelfHitTestInvisible)
		[
			SNew(SBorder)
			.BorderImage(WhiteBrush())
			.BorderBackgroundColor(FSlateColor(PanelBg))
			.Padding(FMargin(11.0f, 8.0f))
			[
				SNew(SVerticalBox)
				+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 0.0f, 0.0f, 5.0f)
				[
					Txt(Tx(Solstice::Loc(TEXT("chronicle.title"))), 13, Accent, true)
				]
				+ SVerticalBox::Slot().AutoHeight()[ Body ]
			]
		];
}

TSharedRef<SWidget> SSolsticeHUD::BuildPoolPanel()
{
	TSharedRef<SBox> Body = SNew(SBox).HeightOverride(150.0f)
	[
		SNew(SScrollBox)
		+ SScrollBox::Slot()
		[
			TxtL(TAttribute<FText>::CreateLambda([this]()
			{
				FSimKernel* Kernel = Sim();
				if (!Kernel) { return FText::GetEmpty(); }
				const FCatalog& Catalog = Kernel->GetCatalog();
				FString Built = FString::Printf(TEXT("%s %d / %d\n"),
					*Solstice::Loc(TEXT("pool.unlocked")), Kernel->GetUnlockedCardCount(), Catalog.Cards.Num());
				for (int32 Index = 0; Index < Catalog.Cards.Num(); ++Index)
				{
					if (!Kernel->IsCardUnlocked(Index))
					{
						continue;
					}
					const FCardDef& Card = Catalog.Cards[Index];
					Built += FString::Printf(TEXT("%s %s  %s%s   %s %d\n"),
						Solstice::ElementGlyph(Card.GetElement()),
						*Solstice::TierLabel(Card.Tier),
						*Solstice::Loc2(Card.NameZh, Card.NameEn),
						Card.bProvisional ? TEXT("*") : TEXT(""),
						*Solstice::Loc(TEXT("pool.copies")),
						Kernel->GetCopies(Index));
				}
				return Tx(Built);
			}), 10, Ink)
		]
	];

	return SNew(SBox)
		.WidthOverride(300.0f)
		.Visibility(EVisibility::SelfHitTestInvisible)
		[
			SNew(SBorder)
			.BorderImage(WhiteBrush())
			.BorderBackgroundColor(FSlateColor(PanelBg))
			.Padding(FMargin(11.0f, 8.0f))
			[
				SNew(SVerticalBox)
				+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 0.0f, 0.0f, 5.0f)
				[
					Txt(Tx(Solstice::Loc(TEXT("pool.title"))), 13, Accent, true)
				]
				+ SVerticalBox::Slot().AutoHeight()[ Body ]
			]
		];
}

TSharedRef<SWidget> SSolsticeHUD::BuildCreatorPanel()
{
	TSharedRef<SVerticalBox> Body = SNew(SVerticalBox);

	Body->AddSlot().AutoHeight()
	[
		Txt(Tx(Solstice::Loc(TEXT("creator.stub"))), 11, InkSoft)
	];

	// Creator step 8: sow the life seed. Chaos has no life at all (WORLD SS3.3 step 5), so this
	// is the one switch that turns an empty paper world into an ecology.
	Body->AddSlot().AutoHeight().Padding(0.0f, 6.0f, 0.0f, 0.0f)
	[
		SmallButton(Tx(Solstice::Loc(TEXT("creator.life_seed"))), FOnClicked::CreateLambda([this]()
		{
			if (ASolsticePlayerController* Controller = PC()) { Controller->SowLifeSeed(); }
			return FReply::Handled();
		}))
	];

	// Creator step 2: reshape. Every preset from world.json is offered, so the six terrain
	// algorithms are reachable without leaving the game.
	Body->AddSlot().AutoHeight().Padding(0.0f, 6.0f, 0.0f, 2.0f)
	[
		Txt(Tx(Solstice::Loc(TEXT("creator.reshape"))), 11, InkSoft)
	];

	Body->AddSlot().AutoHeight()
	[
		TxtL(TAttribute<FText>::CreateLambda([this]()
		{
			USolsticeGameInstance* Instance = GI();
			if (!Instance) { return FText::GetEmpty(); }
			FString Built;
			const TArray<FWorldConfig>& Presets = Instance->Content().Catalog.Presets;
			for (int32 Index = 0; Index < Presets.Num(); ++Index)
			{
				Built += FString::Printf(TEXT("[%d] %s   "), Index + 1,
					*Solstice::Loc2(Presets[Index].RealmNameZh, Presets[Index].RealmNameEn));
				if ((Index + 1) % 2 == 0) { Built += TEXT("\n"); }
			}
			return Tx(Built);
		}), 11, Ink)
	];

	Body->AddSlot().AutoHeight().Padding(0.0f, 4.0f, 0.0f, 0.0f)
	[
		TxtL(TAttribute<FText>::CreateLambda([this]()
		{
			USolsticeGameInstance* Instance = GI();
			if (!Instance) { return FText::GetEmpty(); }
			return Tx(FString::Printf(TEXT("%s: %s"),
				*Solstice::Loc(TEXT("game.seed")),
				*FString::FromInt(static_cast<int32>(Instance->Kernel().GetConfig().Seed))));
		}), 10, InkSoft)
	];

	return SNew(SBox)
		.WidthOverride(244.0f)
		.Visibility(EVisibility::SelfHitTestInvisible)
		[
			SNew(SBorder)
			.BorderImage(WhiteBrush())
			.BorderBackgroundColor(FSlateColor(PanelBg))
			.Padding(FMargin(11.0f, 8.0f))
			[
				SNew(SVerticalBox)
				+ SVerticalBox::Slot().AutoHeight().Padding(0.0f, 0.0f, 0.0f, 5.0f)
				[
					Txt(Tx(Solstice::Loc(TEXT("creator.title"))), 13, Accent, true)
				]
				+ SVerticalBox::Slot().AutoHeight()[ Body ]
			]
		];
}

TSharedRef<SWidget> SSolsticeHUD::BuildHelpPanel()
{
	auto Line = [](const FString& Key) -> TSharedRef<SWidget>
	{
		return Txt(Tx(Solstice::Loc(Key)), 11, InkSoft);
	};

	TSharedRef<SVerticalBox> Body = SNew(SVerticalBox);
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.lmb")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.rmb")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.orbit")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.wheel")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.z")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.r")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.c")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.p")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.b")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.g")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.h")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.f1")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.f2")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.f3")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.f4")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.tab")) ];
	Body->AddSlot().AutoHeight()[ Line(TEXT("help.esc")) ];

	return Panel(Tx(Solstice::Loc(TEXT("help.title"))), Body, 236.0f);
}

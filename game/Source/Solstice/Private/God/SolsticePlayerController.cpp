// Solstice - God layer: the player controller.

#include "God/SolsticePlayerController.h"

#include "Core/SolsticeGameInstance.h"
#include "Engine/World.h"
#include "God/SolsticeObserver.h"
#include "Kismet/GameplayStatics.h"
#include "Sim/SolsticeKernel.h"
#include "World/SolsticeRealmActor.h"

using namespace Solstice;

namespace
{
	constexpr float OrbitSensitivity = 0.55f;
	constexpr float ZoomStep = 1400.0f;
	constexpr float PanSpeed = 5200.0f;
}

ASolsticePlayerController::ASolsticePlayerController()
{
	PrimaryActorTick.bCanEverTick = true;
	bShowMouseCursor = true;
	bEnableClickEvents = false;
	bEnableMouseOverEvents = false;
}

void ASolsticePlayerController::BeginPlay()
{
	Super::BeginPlay();

	SetInputMode(FInputModeGameAndUI()
		.SetHideCursorDuringCapture(false)
		.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock));

	if (ASolsticeObserver* ObserverPawn = Observer())
	{
		if (ASolsticeRealm* RealmActor = Realm())
		{
			const float Radius = RealmActor->GetRealmRadiusUU();
			ObserverPawn->SetDefaults(Radius * 2.1f, -52.0f, -34.0f);
			ObserverPawn->SetFocus(RealmActor->GetRealmCentre());
		}
	}

	SetStatus(TEXT("左键在纸面上释放手牌；Z 可撤回刚落地的实体。"),
		TEXT("Left-click the paper to release a card; Z takes back an entity that just landed."));
}

ASolsticeRealm* ASolsticePlayerController::Realm() const
{
	if (CachedRealm)
	{
		return CachedRealm;
	}
	ASolsticePlayerController* Mutable = const_cast<ASolsticePlayerController*>(this);
	Mutable->CachedRealm = GetWorld() ? Cast<ASolsticeRealm>(UGameplayStatics::GetActorOfClass(GetWorld(), ASolsticeRealm::StaticClass())) : nullptr;
	return CachedRealm;
}

ASolsticeObserver* ASolsticePlayerController::Observer() const
{
	return Cast<ASolsticeObserver>(GetPawn());
}

USolsticeGameInstance* ASolsticePlayerController::Game() const
{
	return GetGameInstance<USolsticeGameInstance>();
}

void ASolsticePlayerController::SetStatus(const FString& Zh, const FString& En)
{
	StatusZh = Zh;
	StatusEn = En;
	StatusAge = 0.0f;
}

int32 ASolsticePlayerController::TileUnderCursor() const
{
	ASolsticeRealm* RealmActor = Realm();
	if (!RealmActor)
	{
		return INDEX_NONE;
	}
	FVector Hit;
	return RealmActor->PickTile(const_cast<ASolsticePlayerController*>(this), Hit);
}

// ======================================================================
// Commands
// ======================================================================

void ASolsticePlayerController::SelectSlot(int32 Slot)
{
	const FSimKernel* Sim = Game() ? &Game()->Kernel() : nullptr;
	if (!Sim)
	{
		return;
	}
	SelectedSlot = FMath::Clamp(Slot, 0, Tuning::HandSize - 1);
	if (Sim->GetHandCardIndex(SelectedSlot) == INDEX_NONE)
	{
		// Slide to the nearest occupied slot so the selection is never on an empty gap.
		for (int32 Step = 1; Step < Tuning::HandSize; ++Step)
		{
			const int32 Right = SelectedSlot + Step;
			if (Right < Tuning::HandSize && Sim->GetHandCardIndex(Right) != INDEX_NONE)
			{
				SelectedSlot = Right;
				return;
			}
			const int32 Left = SelectedSlot - Step;
			if (Left >= 0 && Sim->GetHandCardIndex(Left) != INDEX_NONE)
			{
				SelectedSlot = Left;
				return;
			}
		}
	}
}

void ASolsticePlayerController::CycleSlot(int32 Delta)
{
	for (int32 Step = 1; Step <= Tuning::HandSize; ++Step)
	{
		const int32 Candidate = ((SelectedSlot + Delta * Step) % Tuning::HandSize + Tuning::HandSize) % Tuning::HandSize;
		SelectSlot(Candidate);
		if (Candidate == SelectedSlot)
		{
			return;
		}
	}
}

void ASolsticePlayerController::ReleaseSelectedAtCursor()
{
	const int32 Tile = TileUnderCursor();
	if (Tile == INDEX_NONE)
	{
		SetStatus(TEXT("先把光标移到纸面上"), TEXT("Move the cursor onto the paper first"));
		return;
	}
	ReleaseSelectedAt(Tile);
}

void ASolsticePlayerController::ReleaseSelectedAt(int32 TileIndex)
{
	USolsticeGameInstance* Instance = Game();
	ASolsticeRealm* RealmActor = Realm();
	if (!Instance || !RealmActor || TileIndex == INDEX_NONE)
	{
		return;
	}

	FSimKernel& Sim = Instance->Kernel();

	// Read the card before releasing: the kernel clears the slot and refills it in the same call.
	const int32 CardIndexBefore = Sim.GetHandCardIndex(SelectedSlot);
	const FCardDef* CardBefore = Sim.GetCatalog().CardAt(CardIndexBefore);

	FReleaseResult Result;
	if (!Sim.ReleaseCard(SelectedSlot, TileIndex, bSettleAsEntity, Result))
	{
		SetStatus(Result.ReasonZh, Result.ReasonEn);
		return;
	}

	LastRelease = Result;

	const FString NameZh = CardBefore ? CardBefore->NameZh : FString();
	const FString NameEn = CardBefore ? CardBefore->NameEn : FString();

	SetStatus(
		FString::Printf(TEXT("「%s」释放 · 回响 +%d · 落差 %.2f"), *NameZh, Result.EchoGained, Result.Offset),
		FString::Printf(TEXT("%s released - echo +%d - offset %.2f"), *NameEn, Result.EchoGained, Result.Offset));

	if (Result.bCanUndo)
	{
		StatusZh += TEXT(" · 三秒内可按 Z 撤回");
		StatusEn += TEXT(" - press Z within three seconds to take it back");
	}
	SelectSlot(SelectedSlot);
}

void ASolsticePlayerController::RecycleSelected()
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	FSimKernel& Sim = Instance->Kernel();
	int32 Refund = 0;
	FString ReasonZh;
	FString ReasonEn;
	if (Sim.RecycleCard(SelectedSlot, Refund, ReasonZh, ReasonEn))
	{
		SetStatus(FString::Printf(TEXT("回收返还 %d 回响"), Refund),
			FString::Printf(TEXT("recycled for %d echo"), Refund));
	}
	else
	{
		SetStatus(ReasonZh, ReasonEn);
	}
	SelectSlot(SelectedSlot);
}

void ASolsticePlayerController::RerollHand()
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	Instance->Kernel().RerollHand();
	SelectSlot(0);
	SetStatus(TEXT("换了一手"), TEXT("Hand rerolled"));
}

void ASolsticePlayerController::UndoRelease()
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	FString ReasonZh;
	FString ReasonEn;
	if (Instance->Kernel().UndoPendingSettle(ReasonZh, ReasonEn))
	{
		SetStatus(TEXT("纸还湿着 · 已撤回"), TEXT("Paper was still wet - taken back"));
	}
	else
	{
		SetStatus(ReasonZh, ReasonEn);
	}
}

void ASolsticePlayerController::OpenPack(EPackKind Kind)
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	FSimKernel& Sim = Instance->Kernel();
	FPackResult Result;
	if (!Sim.OpenPack(Kind, static_cast<uint8>(EElement::None), Result))
	{
		SetStatus(TEXT("回响不够，或者这个包现在不开"), TEXT("Not enough echo, or that pack is closed right now"));
		return;
	}
	LastPack = Result;
	SetStatus(FString::Printf(TEXT("开出 %d 张卡，折算回响 %d"), Result.Cards.Num(), Result.ConvertedEcho),
		FString::Printf(TEXT("Opened %d cards, %d echo auto-converted"), Result.Cards.Num(), Result.ConvertedEcho));
	bShowPacks = true;
}

void ASolsticePlayerController::OpenPackForElement(EElement Element)
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	FSimKernel& Sim = Instance->Kernel();
	FPackResult Result;
	if (!Sim.OpenPack(EPackKind::SpecificElement, static_cast<uint8>(Element), Result))
	{
		SetStatus(TEXT("回响不够"), TEXT("Not enough echo"));
		return;
	}
	LastPack = Result;
	SetStatus(FString::Printf(TEXT("开出 %d 张卡"), Result.Cards.Num()),
		FString::Printf(TEXT("Opened %d cards"), Result.Cards.Num()));
	bShowPacks = true;
}

void ASolsticePlayerController::CalmDisturbance(int32 Points)
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	int32 Cost = 0;
	const int32 Lowered = Instance->Kernel().CalmDisturbance(Points, Cost);
	SetStatus(FString::Printf(TEXT("扰动 -%d（花费 %d 回响）"), Lowered, Cost),
		FString::Printf(TEXT("Disturbance -%d (cost %d echo)"), Lowered, Cost));
}

void ASolsticePlayerController::Reshape(int32 PresetIndex)
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	if (Instance->ReshapeToPreset(PresetIndex))
	{
		SetStatus(TEXT("形制已更换"), TEXT("Realm reshaped"));
	}
	else
	{
		SetStatus(TEXT("没有这个形制"), TEXT("No such preset"));
	}
}

void ASolsticePlayerController::CyclePreset()
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	const int32 Count = Instance->GetPresetCount();
	if (Count <= 0)
	{
		return;
	}
	const int32 Current = Instance->Kernel().GetConfig().Algo;
	Reshape((Current + 1) % Count);
}

void ASolsticePlayerController::SowLifeSeed()
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	if (Instance->SowLifeSeed())
	{
		SetStatus(TEXT("生命种子已播下，世界开始自己活着"), TEXT("A life seed is sown; the world starts living on its own"));
	}
	else
	{
		SetStatus(TEXT("生命已经在了"), TEXT("Life is already here"));
	}
	bShowCreator = true;
}

void ASolsticePlayerController::ToggleTimeMode()
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	FSimKernel& Sim = Instance->Kernel();
	const bool bReal = Sim.GetTimeMode() == ETimeMode::Real;
	Sim.SetTimeMode(bReal ? ETimeMode::Virtual : ETimeMode::Real);
	SetStatus(bReal ? TEXT("虚拟时间") : TEXT("现实 1:1 · 与系统时钟同步"),
		bReal ? TEXT("Virtual time") : TEXT("Real 1:1 - locked to the system clock"));
}

void ASolsticePlayerController::TogglePause()
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	FSimKernel& Sim = Instance->Kernel();
	Sim.SetPaused(!Sim.IsPaused());
}

void ASolsticePlayerController::CycleSpeed()
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	FSimKernel& Sim = Instance->Kernel();
	Sim.SetSpeedIndex((Sim.GetSpeedIndex() + 1) % 4);
}

void ASolsticePlayerController::CycleRealPace()
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	FSimKernel& Sim = Instance->Kernel();
	static const float Paces[5] = { 1.0f, 3.0f, 6.0f, 12.0f, 30.0f };
	const float Current = Sim.GetRealMinutesPerWorldDay();
	int32 Index = 1;
	for (int32 Candidate = 0; Candidate < 5; ++Candidate)
	{
		if (FMath::IsNearlyEqual(Paces[Candidate], Current, 0.01f))
		{
			Index = (Candidate + 1) % 5;
			break;
		}
	}
	Sim.SetRealMinutesPerWorldDay(Paces[Index]);
}

void ASolsticePlayerController::ToggleLanguage()
{
	USolsticeGameInstance* Instance = Game();
	if (!Instance)
	{
		return;
	}
	Instance->ToggleLanguage();
}

// ======================================================================
// Input
// ======================================================================

void ASolsticePlayerController::PollInput(float DeltaSeconds)
{
	ASolsticeObserver* ObserverPawn = Observer();
	if (!ObserverPawn)
	{
		return;
	}

	// ---- camera ------------------------------------------------------
	float MouseX = 0.0f;
	float MouseY = 0.0f;
	GetInputMouseDelta(MouseX, MouseY);

	const bool bMiddleDown = IsInputKeyDown(EKeys::MiddleMouseButton);
	if (bMiddleDown)
	{
		ObserverPawn->Orbit(MouseX * OrbitSensitivity, -MouseY * OrbitSensitivity);
	}

	const float Wheel = GetInputAnalogKeyState(EKeys::MouseWheelAxis);
	if (!FMath::IsNearlyZero(Wheel))
	{
		ObserverPawn->Zoom(-Wheel * ZoomStep);
	}

	FVector Focus = ObserverPawn->GetFocus();
	const float Pan = PanSpeed * DeltaSeconds;
	const float YawRad = FMath::DegreesToRadians(ObserverPawn->GetYaw());
	const FVector Forward(FMath::Cos(YawRad), FMath::Sin(YawRad), 0.0f);
	const FVector Right = FVector::CrossProduct(FVector::UpVector, Forward);
	if (IsInputKeyDown(EKeys::W)) { Focus += Forward * Pan; }
	if (IsInputKeyDown(EKeys::S)) { Focus -= Forward * Pan; }
	if (IsInputKeyDown(EKeys::D)) { Focus += Right * Pan; }
	if (IsInputKeyDown(EKeys::A)) { Focus -= Right * Pan; }
	ObserverPawn->SetFocus(Focus);

	// ---- commands ----------------------------------------------------
	const bool bLeftDown = IsInputKeyDown(EKeys::LeftMouseButton);
	if (bLeftDown && !bWasLeftDown)
	{
		ReleaseSelectedAtCursor();
	}
	bWasLeftDown = bLeftDown;
	bWasMiddleDown = bMiddleDown;

	if (WasInputKeyJustPressed(EKeys::RightMouseButton)) { ToggleSettle(); }
	if (WasInputKeyJustPressed(EKeys::SpaceBar)) { ReleaseSelectedAtCursor(); }
	if (WasInputKeyJustPressed(EKeys::X)) { RecycleSelected(); }
	if (WasInputKeyJustPressed(EKeys::R)) { RerollHand(); }
	if (WasInputKeyJustPressed(EKeys::Z)) { UndoRelease(); }
	if (WasInputKeyJustPressed(EKeys::Q)) { CycleSlot(-1); }
	if (WasInputKeyJustPressed(EKeys::E)) { CycleSlot(1); }

	if (WasInputKeyJustPressed(EKeys::One)) { SelectSlot(0); }
	if (WasInputKeyJustPressed(EKeys::Two)) { SelectSlot(1); }
	if (WasInputKeyJustPressed(EKeys::Three)) { SelectSlot(2); }
	if (WasInputKeyJustPressed(EKeys::Four)) { SelectSlot(3); }
	if (WasInputKeyJustPressed(EKeys::Five)) { SelectSlot(4); }
	if (WasInputKeyJustPressed(EKeys::Six)) { SelectSlot(5); }
	if (WasInputKeyJustPressed(EKeys::Seven)) { SelectSlot(6); }
	if (WasInputKeyJustPressed(EKeys::Eight)) { SelectSlot(7); }
	if (WasInputKeyJustPressed(EKeys::Nine)) { SelectSlot(8); }
	if (WasInputKeyJustPressed(EKeys::Zero)) { SelectSlot(9); }

	if (WasInputKeyJustPressed(EKeys::C)) { ToggleChronicle(); }
	if (WasInputKeyJustPressed(EKeys::P)) { TogglePool(); }
	if (WasInputKeyJustPressed(EKeys::B)) { TogglePacks(); }
	if (WasInputKeyJustPressed(EKeys::G)) { ToggleCreator(); }
	if (WasInputKeyJustPressed(EKeys::H)) { ToggleHelp(); }

	if (WasInputKeyJustPressed(EKeys::F1)) { ToggleTimeMode(); }
	if (WasInputKeyJustPressed(EKeys::F2)) { TogglePause(); }
	if (WasInputKeyJustPressed(EKeys::F3)) { CycleSpeed(); }
	if (WasInputKeyJustPressed(EKeys::F4)) { ToggleLanguage(); }
	if (WasInputKeyJustPressed(EKeys::F5)) { CycleRealPace(); }
	if (WasInputKeyJustPressed(EKeys::F6)) { OpenPack(EPackKind::RandomElement); }
	if (WasInputKeyJustPressed(EKeys::F7)) { OpenPack(EPackKind::Special); }
	if (WasInputKeyJustPressed(EKeys::F8)) { CyclePreset(); }
	if (WasInputKeyJustPressed(EKeys::L)) { SowLifeSeed(); }

	if (WasInputKeyJustPressed(EKeys::Escape))
	{
		ConsoleCommand(TEXT("quit"));
	}
}

void ASolsticePlayerController::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	StatusAge += DeltaSeconds;

	// Tab lives outside the bShowUI gate: a hidden HUD must still be able to unhide itself.
	if (WasInputKeyJustPressed(EKeys::Tab)) { ToggleUI(); }

	if (bShowUI)
	{
		PollInput(DeltaSeconds);
	}
}

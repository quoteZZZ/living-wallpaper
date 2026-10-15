// Solstice - God layer: the player controller.
//
// The controller is the command surface. Holding a card, releasing it, taking it back while the
// paper is still wet, calming the disturbance, opening a pack - every one of those is a method
// here, so the Slate HUD and the keyboard are two ways into exactly the same calls
// (docs/gameplay/INTERVENTION.md SS1, docs/gameplay/ECONOMY.md SS5).
//
// Input is polled once per frame rather than bound through action mappings: the HUD needs the
// mouse free for its own buttons, and polling keeps the two from fighting over capture.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "Sim/SolsticeTypes.h"
#include "SolsticePlayerController.generated.h"

class ASolsticeObserver;
class ASolsticeRealm;
class USolsticeGameInstance;

UCLASS()
class SOLSTICE_API ASolsticePlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	ASolsticePlayerController();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	ASolsticeRealm* Realm() const;
	ASolsticeObserver* Observer() const;
	USolsticeGameInstance* Game() const;

	// ------------------------------------------------------------------
	// Commands - called by the keyboard polling below and by the HUD
	// ------------------------------------------------------------------

	void SelectSlot(int32 Slot);
	void CycleSlot(int32 Delta);
	int32 GetSelectedSlot() const { return SelectedSlot; }
	bool IsSettleAsEntity() const { return bSettleAsEntity; }
	void ToggleSettle() { bSettleAsEntity = !bSettleAsEntity; }

	void ReleaseSelectedAtCursor();
	void ReleaseSelectedAt(int32 TileIndex);
	void RecycleSelected();
	void RerollHand();
	void UndoRelease();

	void OpenPack(Solstice::EPackKind Kind);
	void OpenPackForElement(Solstice::EElement Element);
	void CalmDisturbance(int32 Points);
	void Reshape(int32 PresetIndex);
	void CyclePreset();
	void SowLifeSeed();

	void ToggleTimeMode();
	void TogglePause();
	void CycleSpeed();
	void CycleRealPace();
	void ToggleLanguage();

	// ---- panel visibility (the HUD also flips these) ----
	void ToggleChronicle() { bShowChronicle = !bShowChronicle; }
	void TogglePool() { bShowPool = !bShowPool; }
	void TogglePacks() { bShowPacks = !bShowPacks; }
	void ToggleCreator() { bShowCreator = !bShowCreator; }
	void ToggleHelp() { bShowHelp = !bShowHelp; }
	void ToggleUI() { bShowUI = !bShowUI; }

	bool IsChronicleOpen() const { return bShowChronicle; }
	bool IsPoolOpen() const { return bShowPool; }
	bool IsPacksOpen() const { return bShowPacks; }
	bool IsCreatorOpen() const { return bShowCreator; }
	bool IsHelpOpen() const { return bShowHelp; }
	bool IsUIOpen() const { return bShowUI; }

	/** Tile under the cursor, or INDEX_NONE. */
	int32 TileUnderCursor() const;

	const Solstice::FReleaseResult& GetLastRelease() const { return LastRelease; }
	const Solstice::FPackResult& GetLastPack() const { return LastPack; }
	const FString& GetStatusZh() const { return StatusZh; }
	const FString& GetStatusEn() const { return StatusEn; }
	bool HasStatus() const { return StatusAge < 6.0f; }

private:
	void PollInput(float DeltaSeconds);
	void SetStatus(const FString& Zh, const FString& En);

	ASolsticeRealm* CachedRealm = nullptr;

	int32 SelectedSlot = 0;
	bool bSettleAsEntity = false;
	bool bShowChronicle = false;
	bool bShowPool = false;
	bool bShowPacks = false;
	bool bShowCreator = false;
	bool bShowHelp = true;
	bool bShowUI = true;

	bool bWasLeftDown = false;
	bool bWasMiddleDown = false;

	Solstice::FReleaseResult LastRelease;
	Solstice::FPackResult LastPack;
	FString StatusZh;
	FString StatusEn;
	float StatusAge = 1000.0f;
};

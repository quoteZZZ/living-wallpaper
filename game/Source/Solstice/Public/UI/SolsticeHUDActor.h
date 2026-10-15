// Solstice - UI layer: the HUD actor.
//
// The HUD is a Slate widget added straight to the viewport. There is no UMG asset and no widget
// blueprint, so the entire interface rebuilds from code.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "SolsticeHUDActor.generated.h"

class SSolsticeHUD;

UCLASS()
class SOLSTICE_API ASolsticeHUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	TSharedPtr<SSolsticeHUD> Widget;
};

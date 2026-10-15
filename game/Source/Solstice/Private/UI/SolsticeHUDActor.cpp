// Solstice - UI layer: the HUD actor.

#include "UI/SolsticeHUDActor.h"

#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "God/SolsticePlayerController.h"
#include "UI/SolsticeHUD.h"

void ASolsticeHUD::BeginPlay()
{
	Super::BeginPlay();

	ASolsticePlayerController* Controller = Cast<ASolsticePlayerController>(PlayerOwner);
	if (!Controller || !GEngine || !GEngine->GameViewport)
	{
		return;
	}

	Widget = SNew(SSolsticeHUD).Controller(Controller);
	GEngine->GameViewport->AddViewportWidgetContent(Widget.ToSharedRef(), 10);
}

void ASolsticeHUD::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (Widget.IsValid() && GEngine && GEngine->GameViewport)
	{
		GEngine->GameViewport->RemoveViewportWidgetContent(Widget.ToSharedRef());
	}
	Widget.Reset();

	Super::EndPlay(EndPlayReason);
}

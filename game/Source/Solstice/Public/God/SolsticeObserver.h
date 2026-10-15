// Solstice - God layer: the observer.
//
// The player is not in the realm; the player looks at it. The camera hangs off a spring arm
// that orbits a focus point on the paper, which is the whole reason the diorama reads as an
// object rather than as a place (docs/art/ART-STYLE.md SS3).

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "SolsticeObserver.generated.h"

class UCameraComponent;
class USpringArmComponent;

UCLASS()
class SOLSTICE_API ASolsticeObserver : public APawn
{
	GENERATED_BODY()

public:
	ASolsticeObserver();

	/** Orbit the camera. Yaw and pitch are in degrees, distance in Unreal units. */
	void Orbit(float DeltaYaw, float DeltaPitch);
	void Zoom(float DeltaDistance);

	void SetFocus(const FVector& InFocus) { Focus = InFocus; }
	FVector GetFocus() const { return Focus; }
	void SetDistance(float InDistance);
	void SetDefaults(float InDistance, float InYaw, float InPitch);

	float GetDistance() const { return Distance; }
	float GetYaw() const { return Yaw; }
	float GetPitch() const { return Pitch; }

	UCameraComponent* GetCamera() const { return Camera; }

protected:
	UPROPERTY() TObjectPtr<USceneComponent> Root;
	UPROPERTY() TObjectPtr<USpringArmComponent> Boom;
	UPROPERTY() TObjectPtr<UCameraComponent> Camera;

	float Distance = 17000.0f;
	float Yaw = -52.0f;
	float Pitch = -34.0f;
	FVector Focus = FVector::ZeroVector;

	void Apply();
};

// Solstice - God layer: the observer.

#include "God/SolsticeObserver.h"

#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"

ASolsticeObserver::ASolsticeObserver()
{
	PrimaryActorTick.bCanEverTick = false;

	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	SetRootComponent(Root);

	Boom = CreateDefaultSubobject<USpringArmComponent>(TEXT("Boom"));
	Boom->SetupAttachment(Root);
	Boom->SetUsingAbsoluteRotation(true);
	Boom->bDoCollisionTest = false;
	Boom->bEnableCameraLag = true;
	Boom->CameraLagSpeed = 9.0f;
	Boom->bEnableCameraRotationLag = true;
	Boom->CameraRotationLagSpeed = 12.0f;
	Boom->TargetArmLength = Distance;
	Boom->SocketOffset = FVector(0.0f, 0.0f, 260.0f);

	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
	Camera->SetupAttachment(Boom, USpringArmComponent::SocketName);
	Camera->bUsePawnControlRotation = false;
	// A long lens compresses the realm the way a tilt-shift shot of a real diorama does.
	Camera->SetFieldOfView(28.0f);

	Apply();
}

void ASolsticeObserver::SetDefaults(float InDistance, float InYaw, float InPitch)
{
	Distance = FMath::Clamp(InDistance, 2000.0f, 60000.0f);
	Yaw = InYaw;
	Pitch = FMath::Clamp(InPitch, -88.0f, -4.0f);
	Apply();
}

void ASolsticeObserver::Orbit(float DeltaYaw, float DeltaPitch)
{
	Yaw += DeltaYaw;
	Pitch = FMath::Clamp(Pitch + DeltaPitch, -88.0f, -4.0f);
	Apply();
}

void ASolsticeObserver::Zoom(float DeltaDistance)
{
	Distance = FMath::Clamp(Distance + DeltaDistance, 2500.0f, 60000.0f);
	Apply();
}

void ASolsticeObserver::SetDistance(float InDistance)
{
	Distance = FMath::Clamp(InDistance, 2500.0f, 60000.0f);
	Apply();
}

void ASolsticeObserver::Apply()
{
	if (Boom)
	{
		Boom->TargetArmLength = Distance;
		Boom->SetRelativeRotation(FRotator(Pitch, Yaw, 0.0f));
	}
	SetActorLocation(Focus);
}

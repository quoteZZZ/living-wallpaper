// Solstice - World layer: the realm actor.

#include "World/SolsticeRealmActor.h"

#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/SkyLightComponent.h"
#include "Core/SolsticeGameInstance.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "ProceduralMeshComponent.h"
#include "Solstice.h"
#include "Render/SolsticePaperMaterial.h"

using namespace Solstice;

namespace
{
	/** How often the standees and the sky are re-meshed, in seconds. */
	constexpr float PropInterval = 0.10f;
	constexpr float SkyInterval = 0.20f;

	constexpr float DomeRadiusFactor = 1.34f;
}

ASolsticeRealm::ASolsticeRealm()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickGroup = TG_PrePhysics;

	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	SetRootComponent(Root);

	BaseMesh = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("BaseMesh"));
	BaseMesh->SetupAttachment(Root);
	BaseMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	BaseMesh->bUseAsyncCooking = true;

	SkyMesh = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("SkyMesh"));
	SkyMesh->SetupAttachment(Root);
	SkyMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	SkyMesh->SetCastShadow(false);

	PropMesh = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("PropMesh"));
	PropMesh->SetupAttachment(Root);
	PropMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	PropMesh->SetCastShadow(false);
	PropMesh->bUseAsyncCooking = true;

	SunLight = CreateDefaultSubobject<UDirectionalLightComponent>(TEXT("SunLight"));
	SunLight->SetupAttachment(Root);
	SunLight->SetMobility(EComponentMobility::Movable);
	SunLight->SetIntensity(1.0f);
	SunLight->SetCastShadows(false);
	// The paper material is unlit and computes its own hard bands, but it still reads the main
	// directional light's *direction*; that is the only reason this light exists.
	SunLight->SetLightColor(FLinearColor(1.0f, 0.97f, 0.92f));

	SkyLight = CreateDefaultSubobject<USkyLightComponent>(TEXT("SkyLight"));
	SkyLight->SetupAttachment(Root);
	SkyLight->SetMobility(EComponentMobility::Movable);
	SkyLight->SetIntensity(0.4f);

	Fog = CreateDefaultSubobject<UExponentialHeightFogComponent>(TEXT("Fog"));
	Fog->SetupAttachment(Root);
	Fog->SetVisibility(true);
	Fog->SetFogDensity(0.012f);
	Fog->SetFogHeightFalloff(0.06f);
	Fog->SetFogInscatteringColor(FLinearColor(0.72f, 0.74f, 0.78f));
	Fog->SetStartDistance(2600.0f);
}

USolsticeGameInstance* ASolsticeRealm::Game() const
{
	return GetGameInstance<USolsticeGameInstance>();
}

FSimKernel* ASolsticeRealm::Kernel() const
{
	USolsticeGameInstance* Instance = Game();
	return Instance ? &Instance->Kernel() : nullptr;
}

void ASolsticeRealm::BeginPlay()
{
	Super::BeginPlay();

	Palette = Gen::DefaultPalette();

	FSimKernel* Sim = Kernel();
	if (!Sim)
	{
		UE_LOG(LogSolstice, Error, TEXT("realm has no kernel; check that SolsticeGameInstance is set"));
		return;
	}

	ChunksPerAxis = FMath::Max(1, Sim->GetChunksPerAxis());

	ChunkMeshes.Reset();
	for (int32 Index = 0; Index < ChunksPerAxis * ChunksPerAxis; ++Index)
	{
		UProceduralMeshComponent* Chunk = NewObject<UProceduralMeshComponent>(this,
			*FString::Printf(TEXT("Chunk_%d"), Index));
		Chunk->SetupAttachment(Root);
		Chunk->RegisterComponent();
		Chunk->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
		Chunk->SetCollisionObjectType(ECC_WorldStatic);
		Chunk->SetCollisionResponseToAllChannels(ECR_Block);
		Chunk->bUseAsyncCooking = true;
		FPaperMaterials::ApplyToMesh(Chunk);
		ChunkMeshes.Add(Chunk);
	}

	FPaperMaterials::ApplyToMesh(BaseMesh);
	FPaperMaterials::ApplyToMesh(SkyMesh);
	FPaperMaterials::ApplyToMesh(PropMesh);

	BuildStatics();
	FPaperMaterials::ApplySky(Sim->GetSky(), Sim->IsChaos());

	UE_LOG(LogSolstice, Log, TEXT("realm built: %dx%d tiles in %d chunk mesh(es); paper mode = %s"),
		Sim->GetSize(), Sim->GetSize(), ChunkMeshes.Num(),
		FPaperMaterials::Get().bAuthored ? TEXT("authored") : TEXT("engine fallback"));
}

void ASolsticeRealm::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	ChunkMeshes.Reset();
	Super::EndPlay(EndPlayReason);
}

void ASolsticeRealm::BuildStatics()
{
	FSimKernel* Sim = Kernel();
	if (!Sim)
	{
		return;
	}

	// The kraft base never changes once the realm size is fixed.
	Scratch.Reset();
	Gen::BuildBase(*Sim, Palette, Scratch);
	Scratch.PushTo(BaseMesh, 0, false);

	BuildSkyMesh();
	bStaticsBuilt = true;
}

void ASolsticeRealm::BuildSkyMesh()
{
	FSimKernel* Sim = Kernel();
	if (!Sim)
	{
		return;
	}

	const FSkyState& Sky = Sim->GetSky();
	const FVector Centre(0.0f, 0.0f, 0.0f);
	const float Radius = GetRealmRadiusUU() * DomeRadiusFactor;

	// Day/night decides the dome's two ends; cloud flattens the difference.
	const float Altitude = FMath::Clamp(Sky.SolarAltitudeDeg, -18.0f, 90.0f);
	const float Daylight = FMath::Clamp((Altitude + 4.0f) / 10.0f, 0.0f, 1.0f);
	const float Cloud = FMath::Clamp(Sky.CloudCover, 0.0f, 1.0f);

	const FLinearColor DayZenith(0.34f, 0.52f, 0.78f);
	const FLinearColor NightZenith(0.04f, 0.05f, 0.11f);
	const FLinearColor WarmHorizon(0.94f, 0.72f, 0.50f);

	FLinearColor Zenith = FMath::Lerp(NightZenith, DayZenith, Daylight);
	FLinearColor Horizon = FMath::Lerp(FMath::Lerp(FLinearColor(0.10f, 0.11f, 0.16f), WarmHorizon, Daylight), FLinearColor(0.62f, 0.64f, 0.68f), Cloud * 0.75f);

	if (Sim->IsChaos())
	{
		// Chaos: the sky is plain paper too. The first colour in the world should be the player's.
		Zenith = FMath::Lerp(Zenith, FLinearColor(0.88f, 0.86f, 0.82f), 0.45f);
		Horizon = FMath::Lerp(Horizon, FLinearColor(0.92f, 0.90f, 0.86f), 0.45f);
	}

	Scratch.Reset();
	Gen::BuildSkyDome(Centre, Radius, Zenith, Horizon, Scratch);
	Gen::BuildPetals(Centre, Radius * 0.97f, 14, Horizon * 1.06f, Zenith * 0.9f, Scratch);

	// The sun and the moon are paper discs pinned to the dome.
	const float AltRad = FMath::DegreesToRadians(FMath::Clamp(Sky.SolarAltitudeDeg, -30.0f, 90.0f));
	const float AzRad = FMath::DegreesToRadians(Sky.SunAzimuthDeg);
	const FVector SunDir(FMath::Cos(AltRad) * FMath::Cos(AzRad), FMath::Cos(AltRad) * FMath::Sin(AzRad), FMath::Sin(AltRad));
	FVector SunRight = FVector::CrossProduct(SunDir, FVector::UpVector).GetSafeNormal();
	if (SunRight.IsNearlyZero())
	{
		SunRight = FVector(1.0f, 0.0f, 0.0f);
	}
	const FVector SunUp = FVector::CrossProduct(SunRight, SunDir).GetSafeNormal();

	const FLinearColor DiscColour = FMath::Lerp(FLinearColor(0.98f, 0.86f, 0.62f), FLinearColor(1.0f, 0.97f, 0.90f), Daylight);
	Gen::BuildDisc(Centre + SunDir * (Radius * 0.94f), SunRight * (Radius * 0.09f), SunUp * (Radius * 0.09f), 1.0f, DiscColour * (0.35f + 0.65f * Daylight), Scratch);

	const FVector MoonDir = -SunDir;
	const FVector MoonRight = FVector::CrossProduct(MoonDir, FVector::UpVector).GetSafeNormal();
	const FVector MoonUp = FVector::CrossProduct(MoonRight, MoonDir).GetSafeNormal();
	Gen::BuildDisc(Centre + MoonDir * (Radius * 0.94f), MoonRight * (Radius * 0.06f), MoonUp * (Radius * 0.06f), 1.0f, FLinearColor(0.86f, 0.88f, 0.92f) * (1.0f - Daylight * 0.75f), Scratch);

	Scratch.PushTo(SkyMesh, 0, false);
	SkyMesh->SetVisibility(bSkyVisible);
}

void ASolsticeRealm::RebuildDirtyChunks(int32 Budget)
{
	FSimKernel* Sim = Kernel();
	if (!Sim || ChunkMeshes.Num() == 0)
	{
		return;
	}

	int32 Built = 0;
	for (int32 ChunkY = 0; ChunkY < ChunksPerAxis && Built < Budget; ++ChunkY)
	{
		for (int32 ChunkX = 0; ChunkX < ChunksPerAxis && Built < Budget; ++ChunkX)
		{
			const int32 Index = ChunkY * ChunksPerAxis + ChunkX;
			if (!ChunkMeshes.IsValidIndex(Index))
			{
				continue;
			}
			const bool bDirty = Sim->IsRegionDirty(ChunkX, ChunkY) || !Sim->IsRegionEverBuilt(ChunkX, ChunkY);
			if (!bDirty)
			{
				continue;
			}
			Scratch.Reset();
			Gen::BuildChunk(*Sim, ChunkX, ChunkY, Palette, Scratch);
			Scratch.PushTo(ChunkMeshes[Index], 0, true);
			Sim->ClearRegionDirty(ChunkX, ChunkY);
			Sim->MarkRegionBuilt(ChunkX, ChunkY);
			++Built;
		}
	}
}

void ASolsticeRealm::RebuildProps()
{
	FSimKernel* Sim = Kernel();
	if (!Sim)
	{
		return;
	}
	Scratch.Reset();
	OutlineScratch.Reset();
	Gen::BuildLife(*Sim, Palette, Scratch, OutlineScratch);

	Scratch.PushTo(PropMesh, 0, false);
	OutlineScratch.PushTo(PropMesh, 1, false);
}

void ASolsticeRealm::UpdateSun()
{
	FSimKernel* Sim = Kernel();
	if (!Sim)
	{
		return;
	}
	const FSkyState& Sky = Sim->GetSky();

	// Azimuth is expressed as an Unreal yaw, so the light rotation is a straight mapping.
	SunLight->SetWorldRotation(FRotator(-FMath::Clamp(Sky.SolarAltitudeDeg, -60.0f, 90.0f), Sky.SunAzimuthDeg, 0.0f));
	SunLight->SetIntensity(FMath::Lerp(0.15f, 1.0f, FMath::Clamp((Sky.SolarAltitudeDeg + 8.0f) / 18.0f, 0.0f, 1.0f)));

	const float Wet = FMath::Clamp(Sky.RainIntensity * 0.7f + Sky.CloudCover * 0.3f, 0.0f, 1.0f);
	Fog->SetFogDensity(FMath::Lerp(0.008f, 0.055f, Wet));
	Fog->SetFogInscatteringColor(FMath::Lerp(FLinearColor(0.70f, 0.73f, 0.78f), FLinearColor(0.46f, 0.49f, 0.55f), Wet));
}

void ASolsticeRealm::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	USolsticeGameInstance* Instance = Game();
	FSimKernel* Sim = Kernel();
	if (!Instance || !Sim)
	{
		return;
	}

	if (!bStaticsBuilt)
	{
		BuildStatics();
	}

	Instance->TickSimulation(DeltaSeconds);

	// The camera's tile drives SimLOD (docs/tech/ARCHITECTURE.md SS2.2.3).
	if (APlayerController* Controller = GetWorld() ? GetWorld()->GetFirstPlayerController() : nullptr)
	{
		FVector ViewLocation;
		FRotator ViewRotation;
		Controller->GetPlayerViewPoint(ViewLocation, ViewRotation);
		int32 FocusTile = INDEX_NONE;
		if (WorldToTile(ViewLocation, FocusTile))
		{
			Sim->SetFocusTile(FocusTile);
		}
	}

	RebuildDirtyChunks(2);

	PropAccumulator += DeltaSeconds;
	if (PropAccumulator >= PropInterval)
	{
		PropAccumulator = 0.0f;
		RebuildProps();
	}

	SkyAccumulator += DeltaSeconds;
	const float Altitude = Sim->GetSky().SolarAltitudeDeg;
	if (SkyAccumulator >= SkyInterval || FMath::Abs(Altitude - LastSolarAltitude) > 0.75f)
	{
		SkyAccumulator = 0.0f;
		LastSolarAltitude = Altitude;
		BuildSkyMesh();
	}

	FPaperMaterials::ApplySky(Sim->GetSky(), Sim->IsChaos());
	UpdateSun();
}

FVector ASolsticeRealm::GetRealmCentre() const
{
	return GetActorLocation();
}

float ASolsticeRealm::GetRealmRadiusUU() const
{
	const FSimKernel* Sim = Kernel();
	const int32 Size = Sim ? Sim->GetSize() : 128;
	return static_cast<float>(Size) * 0.5f * MeterUU;
}

FVector ASolsticeRealm::TileToWorld(int32 TileIndex) const
{
	const FSimKernel* Sim = Kernel();
	if (!Sim || TileIndex < 0)
	{
		return GetActorLocation();
	}
	int32 X = 0;
	int32 Y = 0;
	Sim->IndexToXY(TileIndex, X, Y);
	return TileSurfaceWorld(X, Y);
}

FVector ASolsticeRealm::TileSurfaceWorld(int32 TileX, int32 TileY) const
{
	const FSimKernel* Sim = Kernel();
	if (!Sim)
	{
		return GetActorLocation();
	}
	const FTile* Tile = Sim->TileAt(TileX, TileY);
	const float Surface = Tile ? FMath::Max(Tile->Height, Tile->IsWater() ? Sim->GetSky().WaterLevel : Tile->Height) : 0.0f;
	return GetActorLocation() + Gen::TileToLocal(*Sim, TileX, TileY, Surface);
}

bool ASolsticeRealm::WorldToTile(const FVector& WorldLocation, int32& OutTileIndex) const
{
	OutTileIndex = INDEX_NONE;
	const FSimKernel* Sim = Kernel();
	if (!Sim)
	{
		return false;
	}
	const FVector Local = WorldLocation - GetActorLocation();
	const float Half = static_cast<float>(Sim->GetSize()) * 0.5f;
	const int32 X = FMath::FloorToInt(Local.X / MeterUU + Half + 0.5f);
	const int32 Y = FMath::FloorToInt(Local.Y / MeterUU + Half + 0.5f);
	if (!Sim->InBounds(X, Y))
	{
		return false;
	}
	OutTileIndex = Sim->ToIndex(X, Y);
	return true;
}

int32 ASolsticeRealm::PickTile(APlayerController* Controller, FVector& OutHitLocation) const
{
	OutHitLocation = FVector::ZeroVector;
	if (!Controller || !GetWorld())
	{
		return INDEX_NONE;
	}

	FVector RayOrigin;
	FVector RayDirection;
	if (!Controller->DeprojectMousePositionToWorld(RayOrigin, RayDirection))
	{
		return INDEX_NONE;
	}

	const float Reach = GetRealmRadiusUU() * 6.0f;
	FHitResult Hit;
	FCollisionQueryParams Params(SCENE_QUERY_STAT(SolsticePick), false, this);
	const bool bHit = GetWorld()->LineTraceSingleByChannel(
		Hit, RayOrigin, RayOrigin + RayDirection * Reach, ECC_Visibility, Params);
	if (!bHit)
	{
		return INDEX_NONE;
	}

	OutHitLocation = Hit.ImpactPoint;
	int32 Tile = INDEX_NONE;
	return WorldToTile(Hit.ImpactPoint, Tile) ? Tile : INDEX_NONE;
}

void ASolsticeRealm::SetSkyVisible(bool bVisible)
{
	bSkyVisible = bVisible;
	SkyMesh->SetVisibility(bVisible);
}

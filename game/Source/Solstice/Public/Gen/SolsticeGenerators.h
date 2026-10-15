// Solstice - Gen layer: the procedural geometry generators.
//
// Nothing here is modelled by hand. The paper diorama is produced from four rules
// (docs/art/ART-STYLE.md SS2):
//   1. the ground is a stack of cut paper plates, so every height step shows a cut edge;
//   2. whole-metre contours are inked as ribbons, so the terrain reads as a topographic model;
//   3. living things are flat standees with a printed outline card behind them;
//   4. the world is closed by a paper dome ringed with petals.
//
// Layer rule: Gen/ reads Sim, Sim never reads Gen.

#pragma once

#include "CoreMinimal.h"
#include "Gen/SolsticeMeshBuilder.h"
#include "Sim/SolsticeKernel.h"

namespace Solstice
{
	/** Presentation palette. Never read by the simulation. */
	struct FPaperPalette
	{
		FLinearColor CutEdge = FLinearColor(0.86f, 0.82f, 0.74f);
		FLinearColor Ribbon = FLinearColor(0.35f, 0.30f, 0.26f);
		FLinearColor RawPaper = FLinearColor(0.93f, 0.91f, 0.86f);
		FLinearColor InkWash = FLinearColor(0.16f, 0.14f, 0.13f);
		FLinearColor Water = FLinearColor(0.42f, 0.60f, 0.72f);
		FLinearColor WaterDeep = FLinearColor(0.26f, 0.42f, 0.58f);
	};

	namespace Gen
	{
		FPaperPalette DefaultPalette();

		/** World-space position of a tile's surface, in Unreal units, relative to the realm actor. */
		FVector TileToLocal(const FSimKernel& Kernel, int32 TileX, int32 TileY, float HeightMeters);

		/** Paper colour of one tile: material tone pulled toward raw paper by the chaos state. */
		FLinearColor TileColour(const FTile& Tile, const FPaperPalette& Palette);

		/** One terrain chunk: plates, cut edges, contour ribbons and the water sheet. */
		void BuildChunk(const FSimKernel& Kernel, int32 ChunkX, int32 ChunkY, const FPaperPalette& Palette, FMeshBuilder& Out);

		/** The kraft base slab that turns the terrain into a physical object. */
		void BuildBase(const FSimKernel& Kernel, const FPaperPalette& Palette, FMeshBuilder& Out);

		/** Every living individual as a standee; printed outline cards land in OutOutline. */
		void BuildLife(const FSimKernel& Kernel, const FPaperPalette& Palette, FMeshBuilder& Out, FMeshBuilder& OutOutline);

		/** Lower half of a paper dome, normals pointing inward. */
		void BuildSkyDome(const FVector& Centre, float RadiusUU, const FLinearColor& Zenith, const FLinearColor& Horizon, FMeshBuilder& Out);

		/** The 12-16 petals that ring the dome rim. */
		void BuildPetals(const FVector& Centre, float RadiusUU, int32 Count, const FLinearColor& Inner, const FLinearColor& Outer, FMeshBuilder& Out);

		/** A flat paper disc, used for the sun and the moon. */
		void BuildDisc(const FVector& Centre, const FVector& Right, const FVector& Up, float RadiusUU, const FLinearColor& Colour, FMeshBuilder& Out);
	}
}

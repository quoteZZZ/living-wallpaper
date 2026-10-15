// Solstice - Gen layer: procedural geometry generators.

#include "Gen/SolsticeGenerators.h"

namespace Solstice
{
	namespace
	{
		/** A single flat card in local standee space, corners running around the rim. */
		struct FCard
		{
			FVector P0;
			FVector P1;
			FVector P2;
			FVector P3;
			FLinearColor Colour;
		};

		FCard MakeCard(const FVector& A, const FVector& B, const FVector& C, const FVector& D, const FLinearColor& Colour)
		{
			FCard Card;
			Card.P0 = A;
			Card.P1 = B;
			Card.P2 = C;
			Card.P3 = D;
			Card.Colour = Colour;
			return Card;
		}

		/** A vertical rectangle in the local XZ plane (facing +Y). */
		FCard CardXZ(float X0, float X1, float Z0, float Z1, const FLinearColor& Colour)
		{
			return MakeCard(FVector(X0, 0.0f, Z0), FVector(X1, 0.0f, Z0), FVector(X1, 0.0f, Z1), FVector(X0, 0.0f, Z1), Colour);
		}

		/** A vertical rectangle in the local YZ plane (facing +X), for crossed standees. */
		FCard CardYZ(float Y0, float Y1, float Z0, float Z1, const FLinearColor& Colour)
		{
			return MakeCard(FVector(0.0f, Y0, Z0), FVector(0.0f, Y1, Z0), FVector(0.0f, Y1, Z1), FVector(0.0f, Y0, Z1), Colour);
		}

		/** A horizontal rectangle, used for wings and water-line fins. */
		FCard CardXY(float X0, float X1, float Y0, float Y1, float Z, const FLinearColor& Colour)
		{
			return MakeCard(FVector(X0, Y0, Z), FVector(X1, Y0, Z), FVector(X1, Y1, Z), FVector(X0, Y1, Z), Colour);
		}

		/**
		 * Emit a standee and its printed outline. The outline is the same card, scaled around its
		 * own centre and pushed back along its normal, so a dark rim reads on every silhouette -
		 * exactly how a printed paper standee carries an ink outline.
		 */
		void EmitCards(const TArray<FCard>& Cards, const FTransform& Transform,
			const FLinearColor& Ink, FMeshBuilder& OutBody, FMeshBuilder& OutOutline)
		{
			constexpr float OutlineScale = 1.14f;
			constexpr float OutlinePush = 2.0f;	// 2 cm behind the card

			for (const FCard& Card : Cards)
			{
				const FVector Centre = (Card.P0 + Card.P1 + Card.P2 + Card.P3) * 0.25f;
				FVector Normal = FVector::CrossProduct(Card.P1 - Card.P0, Card.P3 - Card.P0).GetSafeNormal();
				if (Normal.IsNearlyZero())
				{
					Normal = FVector::UpVector;
				}

				const FVector Corners[4] = { Card.P0, Card.P1, Card.P2, Card.P3 };
				FVector Body[4];
				FVector Rim[4];
				for (int32 Index = 0; Index < 4; ++Index)
				{
					Body[Index] = Transform.TransformPosition(Corners[Index]);
					Rim[Index] = Transform.TransformPosition(Centre + (Corners[Index] - Centre) * OutlineScale - Normal * OutlinePush);
				}
				OutBody.QuadP(Body[0], Body[1], Body[2], Body[3], Card.Colour, Card.Colour, Card.Colour, Card.Colour);
				OutOutline.QuadP(Rim[0], Rim[1], Rim[2], Rim[3], Ink, Ink, Ink, Ink);
			}
		}

		/** Surface used for meshing: water tiles present as a flat sheet at the water level. */
		float SurfaceHeight(const FTile& Tile, float WaterLevel)
		{
			if (Tile.IsWater() && WaterLevel > Tile.Height)
			{
				return WaterLevel;
			}
			return Tile.Height;
		}

		/** Cheapest possible paper grain, stable for a given tile so rebuilds never shimmer. */
		float PaperGrain(int32 X, int32 Y)
		{
			uint32 Hash = static_cast<uint32>(X) * 73856093u ^ static_cast<uint32>(Y) * 19349663u;
			Hash ^= Hash >> 13;
			Hash *= 0x5bd1e995u;
			Hash ^= Hash >> 15;
			return static_cast<float>(Hash & 0xFFu) / 255.0f;
		}
	}

	FPaperPalette Gen::DefaultPalette()
	{
		return FPaperPalette();
	}

	FVector Gen::TileToLocal(const FSimKernel& Kernel, int32 TileX, int32 TileY, float HeightMeters)
	{
		const float Half = static_cast<float>(Kernel.GetSize()) * 0.5f;
		return FVector(
			(static_cast<float>(TileX) - Half) * MeterUU,
			(static_cast<float>(TileY) - Half) * MeterUU,
			HeightMeters * MeterUU);
	}

	FLinearColor Gen::TileColour(const FTile& Tile, const FPaperPalette& Palette)
	{
		if (Tile.IsWater())
		{
			// Deeper water is a darker sheet. Depth is read off the tile, which the mesh already knows.
			const float Depth = FMath::Clamp((6.0f - Tile.Height) / 6.0f, 0.0f, 1.0f);
			return FMath::Lerp(Palette.Water, Palette.WaterDeep, Depth);
		}

		FLinearColor Base = MaterialColor(Tile.GetMat());

		if (Tile.Vegetation > 0.01f)
		{
			const FLinearColor Moss(0.40f, 0.54f, 0.28f);
			Base = FMath::Lerp(Base, Moss, FMath::Clamp(Tile.Vegetation, 0.0f, 1.0f) * 0.75f);
		}
		if (Tile.Ash > 0.01f)
		{
			Base = FMath::Lerp(Base, FLinearColor(0.30f, 0.27f, 0.25f), FMath::Clamp(Tile.Ash, 0.0f, 1.0f));
		}
		// The chaos state is uncoloured paper: how much colour shows is exactly how much is painted.
		Base = FMath::Lerp(Palette.RawPaper, Base, FMath::Clamp(Tile.Painted, 0.0f, 1.0f));

		if (Tile.Burning > 0.0f)
		{
			Base = FMath::Lerp(Base, FLinearColor(1.0f, 0.42f, 0.10f), FMath::Clamp(Tile.Burning, 0.0f, 1.0f) * 0.85f);
		}
		return Base;
	}

	void Gen::BuildChunk(const FSimKernel& Kernel, int32 ChunkX, int32 ChunkY, const FPaperPalette& Palette, FMeshBuilder& Out)
	{
		const int32 Size = Kernel.GetSize();
		const int32 ChunkSize = Kernel.GetConfig().ChunkSize;
		const float WaterLevel = Kernel.GetSky().WaterLevel;

		const int32 X0 = ChunkX * ChunkSize;
		const int32 Y0 = ChunkY * ChunkSize;
		const int32 X1 = FMath::Min(X0 + ChunkSize, Size);
		const int32 Y1 = FMath::Min(Y0 + ChunkSize, Size);

		constexpr float PlateThickness = 3.0f;	// the visible thickness of one paper plate

		// ---- pass 1: plates and cut edges -------------------------------------
		float MaxSurface = 0.0f;
		for (int32 Y = Y0; Y < Y1; ++Y)
		{
			for (int32 X = X0; X < X1; ++X)
			{
				const FTile* Tile = Kernel.TileAt(X, Y);
				if (!Tile)
				{
					continue;
				}
				const float Surface = SurfaceHeight(*Tile, WaterLevel);
				MaxSurface = FMath::Max(MaxSurface, Surface);

				const FVector Centre = TileToLocal(Kernel, X, Y, Surface);
				const float HalfTile = MeterUU * 0.5f;
				const float Grain = PaperGrain(X, Y);
				const FLinearColor Colour = TileColour(*Tile, Palette) * (0.94f + Grain * 0.12f);

				Out.FlatQuad(
					Centre.X - HalfTile, Centre.Y - HalfTile,
					Centre.X + HalfTile, Centre.Y + HalfTile,
					Centre.Z, Colour);

				// Cut edges: wherever the neighbour sits lower, the stack's cross-section shows.
				static const int32 NX[4] = { 1, -1, 0, 0 };
				static const int32 NY[4] = { 0, 0, 1, -1 };
				static const FVector EdgeNormal[4] = {
					FVector(1.0f, 0.0f, 0.0f), FVector(-1.0f, 0.0f, 0.0f),
					FVector(0.0f, 1.0f, 0.0f), FVector(0.0f, -1.0f, 0.0f)
				};

				for (int32 Side = 0; Side < 4; ++Side)
				{
					const int32 NXIndex = X + NX[Side];
					const int32 NYIndex = Y + NY[Side];
					const FTile* Neighbour = Kernel.TileAt(NXIndex, NYIndex);
					// Off the edge of the realm counts as height 0, which is what closes the rim.
					const float NeighbourSurface = Neighbour ? SurfaceHeight(*Neighbour, WaterLevel) : 0.0f;
					if (NeighbourSurface >= Surface - 0.001f)
					{
						continue;
					}

					const float Ex = Centre.X + EdgeNormal[Side].X * HalfTile;
					const float Ey = Centre.Y + EdgeNormal[Side].Y * HalfTile;
					const FVector A = (Side == 0 || Side == 1)
						? FVector(Ex, Centre.Y - HalfTile, 0.0f)
						: FVector(Centre.X - HalfTile, Ey, 0.0f);
					const FVector B = (Side == 0 || Side == 1)
						? FVector(Ex, Centre.Y + HalfTile, 0.0f)
						: FVector(Centre.X + HalfTile, Ey, 0.0f);

					const bool bWaterFace = Tile->IsWater();
					const FLinearColor Top = bWaterFace ? Colour : Colour * 0.78f;
					const FLinearColor Bottom = bWaterFace ? Colour * 0.72f : Palette.CutEdge * (0.90f + Grain * 0.10f);
					Out.Wall(A, B, NeighbourSurface * MeterUU - PlateThickness * 0.4f, Centre.Z, EdgeNormal[Side], Bottom, Top);
				}
			}
		}

		// ---- pass 2: inked contour ribbons every whole metre -------------------
		// This is the topographic-model read: each metre of rise is drawn as a line, the way a
		// stacked paper relief map is drawn. Step widens when the terrain is tall, so the ribbon
		// count stays bounded.
		const int32 TopLevel = FMath::Clamp(FMath::CeilToInt(MaxSurface), 1, 64);
		const int32 LevelStep = (TopLevel > 24) ? 2 : 1;
		constexpr float RibbonHalf = 5.0f;

		for (int32 Level = LevelStep; Level <= TopLevel; Level += LevelStep)
		{
			const float LevelZ = static_cast<float>(Level) * MeterUU;
			for (int32 Y = Y0; Y < Y1; ++Y)
			{
				for (int32 X = X0; X < X1; ++X)
				{
					const FTile* Tile = Kernel.TileAt(X, Y);
					if (!Tile || Tile->IsWater())
					{
						continue;
					}
					const float Surface = Tile->Height;
					if (Surface < static_cast<float>(Level) - 0.001f)
					{
						continue;
					}

					const FVector Centre = TileToLocal(Kernel, X, Y, 0.0f);
					const float HalfTile = MeterUU * 0.5f;

					static const int32 NX[4] = { 1, -1, 0, 0 };
					static const int32 NY[4] = { 0, 0, 1, -1 };
					static const FVector EdgeNormal[4] = {
						FVector(1.0f, 0.0f, 0.0f), FVector(-1.0f, 0.0f, 0.0f),
						FVector(0.0f, 1.0f, 0.0f), FVector(0.0f, -1.0f, 0.0f)
					};

					for (int32 Side = 0; Side < 4; ++Side)
					{
						const FTile* Neighbour = Kernel.TileAt(X + NX[Side], Y + NY[Side]);
						const float NeighbourSurface = Neighbour ? SurfaceHeight(*Neighbour, WaterLevel) : 0.0f;
						if (NeighbourSurface >= static_cast<float>(Level) - 0.001f)
						{
							continue;
						}

						// Push the ribbon a couple of centimetres out so it never z-fights the wall.
						const float Push = 3.0f;
						const float Ex = Centre.X + EdgeNormal[Side].X * (HalfTile + Push);
						const float Ey = Centre.Y + EdgeNormal[Side].Y * (HalfTile + Push);
						const FVector A = (Side == 0 || Side == 1)
							? FVector(Ex, Centre.Y - HalfTile, 0.0f)
							: FVector(Centre.X - HalfTile, Ey, 0.0f);
						const FVector B = (Side == 0 || Side == 1)
							? FVector(Ex, Centre.Y + HalfTile, 0.0f)
							: FVector(Centre.X + HalfTile, Ey, 0.0f);

						Out.Wall(A, B, LevelZ - RibbonHalf, LevelZ + RibbonHalf, EdgeNormal[Side], Palette.Ribbon, Palette.Ribbon);
					}
				}
			}
		}
	}

	void Gen::BuildBase(const FSimKernel& Kernel, const FPaperPalette& Palette, FMeshBuilder& Out)
	{
		const int32 Size = Kernel.GetSize();
		const float HalfExtent = static_cast<float>(Size) * 0.5f * MeterUU;
		const float Bottom = -160.0f;	// 1.6 m of kraft board below the lowest paper plate
		const float Top = 0.0f;

		const FLinearColor Kraft = Palette.CutEdge * 0.86f;

		// Bottom face.
		Out.FlatQuad(-HalfExtent, -HalfExtent, HalfExtent, HalfExtent, Bottom, Kraft * 0.8f);
		// Four sides.
		Out.Wall(FVector(-HalfExtent, -HalfExtent, 0.0f), FVector(HalfExtent, -HalfExtent, 0.0f), Bottom, Top, FVector(0.0f, -1.0f, 0.0f), Kraft * 0.7f, Kraft);
		Out.Wall(FVector(HalfExtent, HalfExtent, 0.0f), FVector(-HalfExtent, HalfExtent, 0.0f), Bottom, Top, FVector(0.0f, 1.0f, 0.0f), Kraft * 0.7f, Kraft);
		Out.Wall(FVector(HalfExtent, -HalfExtent, 0.0f), FVector(HalfExtent, HalfExtent, 0.0f), Bottom, Top, FVector(1.0f, 0.0f, 0.0f), Kraft * 0.7f, Kraft);
		Out.Wall(FVector(-HalfExtent, HalfExtent, 0.0f), FVector(-HalfExtent, -HalfExtent, 0.0f), Bottom, Top, FVector(-1.0f, 0.0f, 0.0f), Kraft * 0.7f, Kraft);

		// A horizon board so the realm reads as sitting on a table rather than floating.
		const float HorizonExtent = HalfExtent + 2200.0f;
		Out.FlatQuad(-HorizonExtent, -HorizonExtent, HorizonExtent, HorizonExtent, Bottom - 2.0f, FLinearColor(0.88f, 0.86f, 0.81f));
	}

	void Gen::BuildLife(const FSimKernel& Kernel, const FPaperPalette& Palette, FMeshBuilder& Out, FMeshBuilder& OutOutline)
	{
		const float WaterLevel = Kernel.GetSky().WaterLevel;
		const TArray<FIndividual>& Individuals = Kernel.GetIndividuals();

		for (int32 Index = 0; Index < Individuals.Num(); ++Index)
		{
			const FIndividual& Individual = Individuals[Index];
			const ESpeciesKind Kind = Individual.GetKind();
			if (Kind == ESpeciesKind::MossGrass)
			{
				// Moss-grass is a coverage layer, not an individual (docs/setting/SPECIES.md SS2).
				continue;
			}

			const int32 Size = Kernel.GetSize();
			const int32 TileX = Individual.Tile % Size;
			const int32 TileY = Individual.Tile / Size;
			const FTile* Tile = Kernel.TileAt(TileX, TileY);
			if (!Tile)
			{
				continue;
			}
			const float Surface = (Kind == ESpeciesKind::StreamFish)
				? FMath::Max(Tile->Height, WaterLevel) * MeterUU
				: SurfaceHeight(*Tile, WaterLevel) * MeterUU;

			const FVector Origin = TileToLocal(Kernel, TileX, TileY, 0.0f) + FVector(0.0f, 0.0f, Surface);
			const FRotator Facing(0.0f, static_cast<float>(Individual.Facing) * 45.0f, 0.0f);
			const FTransform Transform(Facing, Origin, FVector(1.0f));

			TArray<FCard> Cards;
			switch (Kind)
			{
			case ESpeciesKind::Shrub:
			{
				// 0.6-1.2 m tall, one tile of crown (SPECIES SS2).
				const FLinearColor Leaf(0.36f, 0.52f, 0.30f);
				const FLinearColor Stem(0.45f, 0.36f, 0.24f);
				Cards.Add(CardXZ(-9.0f, 9.0f, 0.0f, 42.0f, Stem));
				Cards.Add(CardXZ(-52.0f, 52.0f, 34.0f, 92.0f, Leaf));
				Cards.Add(CardXZ(-30.0f, 30.0f, 76.0f, 108.0f, Leaf * 1.08f));
				Cards.Add(CardYZ(-40.0f, 40.0f, 30.0f, 86.0f, Leaf * 0.92f));
				break;
			}
			case ESpeciesKind::Grazer:
			{
				// 0.5 m tall, 0.8 m long (SPECIES SS2).
				const FLinearColor Hide(0.72f, 0.58f, 0.38f);
				const FLinearColor Shade = Hide * 0.85f;
				Cards.Add(CardXZ(-40.0f, 34.0f, 22.0f, 50.0f, Hide));
				Cards.Add(CardXZ(34.0f, 50.0f, 30.0f, 50.0f, Shade));
				Cards.Add(CardXZ(-30.0f, -22.0f, 0.0f, 24.0f, Shade));
				Cards.Add(CardXZ(-12.0f, -4.0f, 0.0f, 24.0f, Shade));
				Cards.Add(CardXZ(10.0f, 18.0f, 0.0f, 24.0f, Shade));
				Cards.Add(CardXZ(24.0f, 32.0f, 0.0f, 24.0f, Shade));
				Cards.Add(CardYZ(-20.0f, 20.0f, 24.0f, 46.0f, Hide * 0.95f));
				break;
			}
			case ESpeciesKind::Raptor:
			{
				// 0.4 m long, 0.8 m wingspan (SPECIES SS2).
				const FLinearColor Feather(0.34f, 0.34f, 0.40f);
				Cards.Add(CardXZ(-20.0f, 22.0f, 18.0f, 34.0f, Feather));
				Cards.Add(CardXZ(22.0f, 34.0f, 22.0f, 32.0f, Feather * 0.85f));
				Cards.Add(CardXY(-10.0f, 6.0f, -40.0f, -6.0f, 30.0f, Feather * 1.1f));
				Cards.Add(CardXY(-10.0f, 6.0f, 6.0f, 40.0f, 30.0f, Feather * 1.1f));
				break;
			}
			case ESpeciesKind::StreamFish:
			{
				// 0.2 m long, lives only on water tiles (SPECIES SS2).
				const FLinearColor Scale(0.76f, 0.84f, 0.88f);
				Cards.Add(CardXZ(-10.0f, 10.0f, -4.0f, 4.0f, Scale));
				Cards.Add(CardXZ(-18.0f, -10.0f, -7.0f, 7.0f, Scale * 0.9f));
				break;
			}
			default:
				break;
			}

			if (Cards.Num() > 0)
			{
				EmitCards(Cards, Transform, Palette.InkWash, Out, OutOutline);
			}
		}
	}

	void Gen::BuildSkyDome(const FVector& Centre, float RadiusUU, const FLinearColor& Zenith, const FLinearColor& Horizon, FMeshBuilder& Out)
	{
		// An open paper collar: the shell runs from 42 deg elevation to the zenith, so an orbit
		// camera looks over the rim into the realm instead of into the outside of a closed dome.
		constexpr int32 Rings = 8;
		constexpr int32 Segments = 48;
		constexpr float StartElevation = 42.0f;

		for (int32 Ring = 0; Ring < Rings; ++Ring)
		{
			const float T0 = static_cast<float>(Ring) / static_cast<float>(Rings);
			const float T1 = static_cast<float>(Ring + 1) / static_cast<float>(Rings);
			const float E0 = FMath::Lerp(StartElevation, 90.0f, T0);
			const float E1 = FMath::Lerp(StartElevation, 90.0f, T1);

			const float R0 = RadiusUU * FMath::Cos(FMath::DegreesToRadians(E0));
			const float Z0 = RadiusUU * FMath::Sin(FMath::DegreesToRadians(E0));
			const float R1 = RadiusUU * FMath::Cos(FMath::DegreesToRadians(E1));
			const float Z1 = RadiusUU * FMath::Sin(FMath::DegreesToRadians(E1));

			const FLinearColor C0 = FMath::Lerp(Horizon, Zenith, T0);
			const FLinearColor C1 = FMath::Lerp(Horizon, Zenith, T1);

			for (int32 Segment = 0; Segment < Segments; ++Segment)
			{
				const float A0 = 2.0f * PI * static_cast<float>(Segment) / static_cast<float>(Segments);
				const float A1 = 2.0f * PI * static_cast<float>(Segment + 1) / static_cast<float>(Segments);

				const FVector P0 = Centre + FVector(FMath::Cos(A0) * R0, FMath::Sin(A0) * R0, Z0);
				const FVector P1 = Centre + FVector(FMath::Cos(A1) * R0, FMath::Sin(A1) * R0, Z0);
				const FVector P2 = Centre + FVector(FMath::Cos(A1) * R1, FMath::Sin(A1) * R1, Z1);
				const FVector P3 = Centre + FVector(FMath::Cos(A0) * R1, FMath::Sin(A0) * R1, Z1);

				Out.QuadP(P0, P1, P2, P3, C0, C0, C1, C1);
			}
		}
	}

	void Gen::BuildPetals(const FVector& Centre, float RadiusUU, int32 Count, const FLinearColor& Inner, const FLinearColor& Outer, FMeshBuilder& Out)
	{
		const int32 PetalCount = FMath::Clamp(Count, 12, 16);
		constexpr int32 Along = 6;

		for (int32 Petal = 0; Petal < PetalCount; ++Petal)
		{
			const float Base = 2.0f * PI * static_cast<float>(Petal) / static_cast<float>(PetalCount);
			const float Span = (2.0f * PI / static_cast<float>(PetalCount)) * 1.35f;

			for (int32 Step = 0; Step < Along; ++Step)
			{
				const float T0 = static_cast<float>(Step) / static_cast<float>(Along);
				const float T1 = static_cast<float>(Step + 1) / static_cast<float>(Along);

				// Each petal curls out and up, the way a paper flower petal does.
				const float R0 = RadiusUU * (0.92f + 0.30f * FMath::Sin(T0 * PI));
				const float R1 = RadiusUU * (0.92f + 0.30f * FMath::Sin(T1 * PI));
				const float Z0 = RadiusUU * (0.30f + 0.40f * T0 * T0);
				const float Z1 = RadiusUU * (0.30f + 0.40f * T1 * T1);

				const float A0 = Base - Span * 0.5f + Span * T0;
				const float A1 = Base - Span * 0.5f + Span * T1;
				const float HalfWidth = Span * 0.5f * (1.0f - 0.55f * T0);

				const FVector P0 = Centre + FVector(FMath::Cos(A0 - HalfWidth) * R0, FMath::Sin(A0 - HalfWidth) * R0, Z0);
				const FVector P1 = Centre + FVector(FMath::Cos(A0 + HalfWidth) * R0, FMath::Sin(A0 + HalfWidth) * R0, Z0);
				const FVector P2 = Centre + FVector(FMath::Cos(A1 + HalfWidth) * R1, FMath::Sin(A1 + HalfWidth) * R1, Z1);
				const FVector P3 = Centre + FVector(FMath::Cos(A1 - HalfWidth) * R1, FMath::Sin(A1 - HalfWidth) * R1, Z1);

				const FLinearColor C0 = FMath::Lerp(Inner, Outer, T0);
				const FLinearColor C1 = FMath::Lerp(Inner, Outer, T1);
				Out.QuadP(P0, P1, P2, P3, C0, C0, C1, C1);
			}
		}
	}

	void Gen::BuildDisc(const FVector& Centre, const FVector& Right, const FVector& Up, float RadiusUU, const FLinearColor& Colour, FMeshBuilder& Out)
	{
		constexpr int32 Sides = 20;
		const FVector Normal = FVector::CrossProduct(Right, Up).GetSafeNormal();
		const int32 CentreIndex = Out.Add(Centre, Normal, FVector2D(0.5f, 0.5f), Colour);
		int32 Previous = INDEX_NONE;
		int32 First = INDEX_NONE;
		for (int32 Side = 0; Side <= Sides; ++Side)
		{
			const float Angle = 2.0f * PI * static_cast<float>(Side) / static_cast<float>(Sides);
			const FVector Rim = Centre + Right * (FMath::Cos(Angle) * RadiusUU) + Up * (FMath::Sin(Angle) * RadiusUU);
			const int32 Index = Out.Add(Rim, Normal, FVector2D(FMath::Cos(Angle) * 0.5f + 0.5f, FMath::Sin(Angle) * 0.5f + 0.5f), Colour);
			if (First == INDEX_NONE)
			{
				First = Index;
			}
			if (Previous != INDEX_NONE)
			{
				Out.Tri(CentreIndex, Previous, Index);
			}
			Previous = Index;
		}
		(void)First;
	}
}

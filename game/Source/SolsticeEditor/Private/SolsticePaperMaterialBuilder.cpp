// Solstice - editor module: the paper master material generator.
//
// The material is built from nodes in code rather than authored in a .uasset, so a fresh clone
// produces exactly the same shader every time. The graph is small and deliberate:
//
//   N       = VertexNormalWS
//   L       = SunDirection          (parameter, pushed by the game each frame)
//   d       = saturate(dot(N, L))
//   band    = clamp(floor(d * 4) / 3, 0, 1)      <- four hard steps, that is the cel look
//   light   = lerp(NightTint, SkyTint, band)
//   emissive= VertexColor * light
//
// Shading model is Unlit on purpose: real-time lights would fight the hard bands, and the whole
// art direction is "flat paper under a definite sun" (docs/art/ART-STYLE.md SS1).

#include "SolsticeEditor.h"

#include "Solstice.h"

#include "AssetRegistry/AssetRegistryModule.h"
#include "Materials/Material.h"
#include "Materials/MaterialExpressionClamp.h"
#include "Materials/MaterialExpressionConstant.h"
#include "Materials/MaterialExpressionConstant3Vector.h"
#include "Materials/MaterialExpressionDotProduct.h"
#include "Materials/MaterialExpressionFloor.h"
#include "Materials/MaterialExpressionLinearInterpolate.h"
#include "Materials/MaterialExpressionMultiply.h"
#include "Materials/MaterialExpressionSaturate.h"
#include "Materials/MaterialExpressionVectorParameter.h"
#include "Materials/MaterialExpressionVertexColor.h"
#include "Materials/MaterialExpressionVertexNormalWS.h"
#include "Misc/PackageName.h"
#include "UObject/Package.h"
#include "UObject/SavePackage.h"

namespace
{
	UMaterial* FindOrCreateMaterial(const FString& PackageName)
	{
		if (UMaterial* Existing = LoadObject<UMaterial>(nullptr, *(PackageName + TEXT(".") + FPackageName::GetShortName(PackageName))))
		{
			return Existing;
		}
		UPackage* Package = CreatePackage(*PackageName);
		if (!Package)
		{
			return nullptr;
		}
		UMaterial* Material = NewObject<UMaterial>(Package, *FPackageName::GetShortName(PackageName), RF_Public | RF_Standalone);
		if (Material)
		{
			FAssetRegistryModule::AssetCreated(Material);
		}
		return Material;
	}

	template <typename T>
	T* AddExpr(UMaterial* Material, int32 X, int32 Y)
	{
		T* Expr = NewObject<T>(Material);
		Expr->MaterialExpressionEditorX = X;
		Expr->MaterialExpressionEditorY = Y;
		Material->GetExpressionCollection().AddExpression(Expr);
		return Expr;
	}

	bool SaveAsset(UObject* Asset, const FString& PackageName)
	{
		UPackage* Package = Asset->GetOutermost();
		Package->MarkPackageDirty();

		const FString FileName = FPackageName::LongPackageNameToFilename(PackageName, FPackageName::GetAssetPackageExtension());
		FSavePackageArgs Args;
		Args.TopLevelFlags = RF_Public | RF_Standalone;
		return UPackage::SavePackage(Package, nullptr, *FileName, Args);
	}

	bool BuildPaper()
	{
		const FString PackageName = TEXT("/Game/Core/M_Paper");
		UMaterial* Material = FindOrCreateMaterial(PackageName);
		if (!Material)
		{
			return false;
		}

		Material->MaterialDomain = MD_Surface;
		Material->BlendMode = BLEND_Opaque;
		Material->SetShadingModel(MSM_Unlit);
		Material->TwoSided = true;

		Material->GetExpressionCollection().Empty();

		UMaterialExpressionVertexNormalWS* Normal = AddExpr<UMaterialExpressionVertexNormalWS>(Material, -1200, -200);

		UMaterialExpressionVectorParameter* SunDirection = AddExpr<UMaterialExpressionVectorParameter>(Material, -1200, 0);
		SunDirection->ParameterName = TEXT("SunDirection");
		SunDirection->DefaultValue = FLinearColor(0.4f, 0.4f, 0.82f, 0.0f);

		UMaterialExpressionVectorParameter* SkyTint = AddExpr<UMaterialExpressionVectorParameter>(Material, -1200, 260);
		SkyTint->ParameterName = TEXT("SkyTint");
		SkyTint->DefaultValue = FLinearColor(0.92f, 0.88f, 0.80f, 1.0f);

		UMaterialExpressionVectorParameter* NightTint = AddExpr<UMaterialExpressionVectorParameter>(Material, -1200, 460);
		NightTint->ParameterName = TEXT("NightTint");
		NightTint->DefaultValue = FLinearColor(0.24f, 0.25f, 0.30f, 1.0f);

		UMaterialExpressionDotProduct* Dot = AddExpr<UMaterialExpressionDotProduct>(Material, -920, -60);
		Dot->A.Expression = Normal;
		Dot->B.Expression = SunDirection;

		UMaterialExpressionSaturate* Saturate = AddExpr<UMaterialExpressionSaturate>(Material, -720, -60);
		Saturate->Input.Expression = Dot;

		UMaterialExpressionConstant* Bands = AddExpr<UMaterialExpressionConstant>(Material, -720, 120);
		Bands->R = 4.0f;

		UMaterialExpressionMultiply* Scale = AddExpr<UMaterialExpressionMultiply>(Material, -520, -40);
		Scale->A.Expression = Saturate;
		Scale->B.Expression = Bands;
		Scale->ConstB = 4.0f;

		UMaterialExpressionFloor* Floor = AddExpr<UMaterialExpressionFloor>(Material, -340, -40);
		Floor->Input.Expression = Scale;

		// A constant node cannot be divided into directly, so the 1/(Bands-1) step is a second
		// constant and a multiply. Drag the multiply's ConstB if the band count ever changes.
		UMaterialExpressionConstant* InvBands = AddExpr<UMaterialExpressionConstant>(Material, -340, 160);
		InvBands->R = 0.3333333f;

		UMaterialExpressionMultiply* Step = AddExpr<UMaterialExpressionMultiply>(Material, -160, -20);
		Step->A.Expression = Floor;
		Step->B.Expression = InvBands;
		Step->ConstB = 0.3333333f;

		UMaterialExpressionClamp* Clamp = AddExpr<UMaterialExpressionClamp>(Material, 20, -20);
		Clamp->Input.Expression = Step;
		Clamp->MinDefault = 0.0f;
		Clamp->MaxDefault = 1.0f;

		UMaterialExpressionLinearInterpolate* Shade = AddExpr<UMaterialExpressionLinearInterpolate>(Material, 220, 60);
		Shade->A.Expression = NightTint;
		Shade->B.Expression = SkyTint;
		Shade->Alpha.Expression = Clamp;

		UMaterialExpressionVertexColor* VertexColour = AddExpr<UMaterialExpressionVertexColor>(Material, 220, 300);

		UMaterialExpressionMultiply* Result = AddExpr<UMaterialExpressionMultiply>(Material, 440, 120);
		Result->A.Expression = Shade;
		Result->B.Expression = VertexColour;

		if (UMaterialEditorOnlyData* EditorData = Material->GetEditorOnlyData())
		{
			EditorData->EmissiveColor.Expression = Result;
		}

		Material->PostEditChange();
		return SaveAsset(Material, PackageName);
	}

	bool BuildInk()
	{
		const FString PackageName = TEXT("/Game/Core/M_Ink");
		UMaterial* Material = FindOrCreateMaterial(PackageName);
		if (!Material)
		{
			return false;
		}

		Material->MaterialDomain = MD_Surface;
		Material->BlendMode = BLEND_Opaque;
		Material->SetShadingModel(MSM_Unlit);
		// Two-sided so the printed outline card reads from either side without winding games.
		Material->TwoSided = true;

		Material->GetExpressionCollection().Empty();

		UMaterialExpressionConstant3Vector* Ink = AddExpr<UMaterialExpressionConstant3Vector>(Material, -400, 0);
		Ink->Constant = FLinearColor(0.055f, 0.048f, 0.042f, 1.0f);

		if (UMaterialEditorOnlyData* EditorData = Material->GetEditorOnlyData())
		{
			EditorData->EmissiveColor.Expression = Ink;
		}

		Material->PostEditChange();
		return SaveAsset(Material, PackageName);
	}
}

bool FSolsticePaperMaterialBuilder::BuildAll()
{
	bool bOk = true;

	const FString PaperPath = FString(FPackageName::LongPackageNameToFilename(TEXT("/Game/Core/M_Paper"), FPackageName::GetAssetPackageExtension()));
	const FString InkPath = FString(FPackageName::LongPackageNameToFilename(TEXT("/Game/Core/M_Ink"), FPackageName::GetAssetPackageExtension()));

	const bool bPaperMissing = !FPaths::FileExists(PaperPath);
	const bool bInkMissing = !FPaths::FileExists(InkPath);

	if (bPaperMissing)
	{
		if (BuildPaper())
		{
			UE_LOG(LogSolstice, Display, TEXT("generated /Game/Core/M_Paper"));
		}
		else
		{
			UE_LOG(LogSolstice, Error, TEXT("could not generate /Game/Core/M_Paper"));
			bOk = false;
		}
	}

	if (bInkMissing)
	{
		if (BuildInk())
		{
			UE_LOG(LogSolstice, Display, TEXT("generated /Game/Core/M_Ink"));
		}
		else
		{
			UE_LOG(LogSolstice, Error, TEXT("could not generate /Game/Core/M_Ink"));
			bOk = false;
		}
	}

	return bOk;
}

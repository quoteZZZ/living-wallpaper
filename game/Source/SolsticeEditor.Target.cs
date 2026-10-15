// Solstice - editor target. Also the host for the headless commandlets
// (SolsticeAssetGen / SolsticeBench), which are how M0 is verified without a display.

using UnrealBuildTool;
using System.Collections.Generic;

public class SolsticeEditorTarget : TargetRules
{
	public SolsticeEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.AddRange(new string[] { "Solstice", "SolsticeEditor" });
	}
}

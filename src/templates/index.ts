import defaultTheme from "./default.json";
import minimalTheme from "./minimal.json";
import elegantTheme from "./elegant.json";
import cyberTheme from "./cyber.json";
import warmTheme from "./warm.json";
import forestTheme from "./forest.json";
import oceanTheme from "./ocean.json";
import sakuraTheme from "./sakura.json";
import starryTheme from "./starry.json";
import metalTheme from "./metal.json";
import yuelingTheme from "./yueling.json";
import type { YanqiTheme } from "../types";

export const templates: Record<string, YanqiTheme> = {
  default: defaultTheme as YanqiTheme,
  minimal: minimalTheme as YanqiTheme,
  elegant: elegantTheme as YanqiTheme,
  cyber: cyberTheme as YanqiTheme,
  warm: warmTheme as YanqiTheme,
  forest: forestTheme as YanqiTheme,
  ocean: oceanTheme as YanqiTheme,
  sakura: sakuraTheme as YanqiTheme,
  starry: starryTheme as YanqiTheme,
  metal: metalTheme as YanqiTheme,
  yueling: yuelingTheme as YanqiTheme
};

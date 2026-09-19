import { RixCelEvaluationSession } from "../src/evaluation-runtime.js";
import { testPortableBundleHost } from "../../../rix/tests/helpers/portable-bundle-host.js";
testPortableBundleHost("RiXCel", options => new RixCelEvaluationSession(options));

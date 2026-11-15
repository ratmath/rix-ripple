var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// ../../packages/core/src/base-system.js
class BaseSystem {
  #base;
  #radix;
  #digitOffset;
  #characters;
  #charMap;
  #name;
  #allowReserved;
  static #prefixMap = new Map;
  static RESERVED_SYMBOLS = new Set([
    "+",
    "-",
    "*",
    "/",
    "^",
    "!",
    "(",
    ")",
    "[",
    "]",
    ":",
    ".",
    "#",
    "~"
  ]);
  constructor(characters, name, options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("Base system options must be an object");
    }
    if (options.allowReserved !== undefined && typeof options.allowReserved !== "boolean") {
      throw new TypeError("allowReserved must be a boolean");
    }
    if (typeof characters === "string") {
      this.#characters = [...characters];
    } else if (Array.isArray(characters)) {
      this.#characters = [...characters];
    } else {
      throw new Error("Characters must be a string or array of strings");
    }
    if (this.#characters.length < 2) {
      throw new Error("Base system must have at least 2 characters");
    }
    if (this.#characters.some((character) => typeof character !== "string" || [...character].length !== 1)) {
      throw new Error("Each base system character must be a single Unicode character");
    }
    this.#base = this.#characters.length;
    this.#radix = options.radix ?? this.#base;
    this.#digitOffset = options.digitOffset ?? 0;
    this.#allowReserved = options.allowReserved === true;
    this.#charMap = this.#createCharacterMap();
    this.#name = name || `Base ${this.#base}`;
    this.#validateBase();
    this.#checkForConflicts();
  }
  get base() {
    return this.#base;
  }
  get radix() {
    return this.#radix;
  }
  get digitOffset() {
    return this.#digitOffset;
  }
  get supportsPositionalFractions() {
    return this.#radix === this.#base && this.#digitOffset === 0;
  }
  get requiresQuoting() {
    return this.#characters.some((character) => BaseSystem.RESERVED_SYMBOLS.has(character));
  }
  get allowsReservedDigits() {
    return this.#allowReserved;
  }
  get characters() {
    return [...this.#characters];
  }
  get charMap() {
    return new Map(this.#charMap);
  }
  getChar(value) {
    const i = Number(value);
    if (!Number.isSafeInteger(i) || i < this.#digitOffset || i >= this.#digitOffset + this.#characters.length) {
      throw new Error(`Value ${value} must be an in-range integer for base ${this.#base}`);
    }
    return this.#characters[i - this.#digitOffset];
  }
  get name() {
    return this.#name;
  }
  #createCharacterMap() {
    const map = new Map;
    for (let i = 0;i < this.#characters.length; i++) {
      map.set(this.#characters[i], i + this.#digitOffset);
    }
    return map;
  }
  #validateBase() {
    if (!Number.isSafeInteger(this.#radix) || Math.abs(this.#radix) < 2) {
      throw new Error("Radix must be a safe integer with absolute value at least 2");
    }
    if (Math.abs(this.#radix) !== this.#characters.length) {
      throw new Error(`Radix ${this.#radix} does not match character set length ${this.#characters.length}`);
    }
    if (!Number.isSafeInteger(this.#digitOffset))
      throw new Error("Digit offset must be a safe integer");
    const uniqueChars = new Set(this.#characters);
    if (uniqueChars.size !== this.#characters.length) {
      throw new Error("Character set contains duplicate characters");
    }
    this.#validateCharacterOrdering();
    if (this.#base > 1000) {
      console.warn(`Very large base system (${this.#base}). This may impact performance.`);
    }
  }
  #validateCharacterOrdering() {
    if (this.#name === "Roman Numerals" || this.#characters.length < 10) {
      return;
    }
    const ranges = [
      { start: "0", end: "9", name: "digits" },
      { start: "a", end: "z", name: "lowercase letters" },
      { start: "A", end: "Z", name: "uppercase letters" }
    ];
    for (const range of ranges) {
      const startCode = range.start.charCodeAt(0);
      const endCode = range.end.charCodeAt(0);
      let rangeChars = [];
      for (let i = 0;i < this.#characters.length; i++) {
        const char = this.#characters[i];
        const code = char.charCodeAt(0);
        if (code >= startCode && code <= endCode) {
          rangeChars.push(char);
        }
      }
      if (rangeChars.length >= 5 && rangeChars.length > (endCode - startCode) / 3) {
        for (let i = 1;i < rangeChars.length; i++) {
          const prevCode = rangeChars[i - 1].charCodeAt(0);
          const currCode = rangeChars[i].charCodeAt(0);
          if (currCode !== prevCode + 1) {
            console.warn(`Non-contiguous ${range.name} range detected in base system`);
            break;
          }
        }
      }
    }
  }
  #checkForConflicts() {
    if (this.#allowReserved)
      return;
    const conflicts = [];
    for (const char of this.#characters) {
      if (BaseSystem.RESERVED_SYMBOLS.has(char)) {
        conflicts.push(char);
      }
    }
    if (conflicts.length > 0) {
      throw new Error(`Base system characters conflict with parser symbols: ${conflicts.join(", ")}. ` + `Reserved symbols are: ${Array.from(BaseSystem.RESERVED_SYMBOLS).join(", ")}`);
    }
  }
  toDecimal(str) {
    if (typeof str !== "string" || str.length === 0) {
      throw new Error("Input must be a non-empty string");
    }
    let negative = false;
    if (str.startsWith("-")) {
      negative = true;
      str = str.slice(1);
    }
    if (str.length === 0) {
      throw new Error("A minus sign must be followed by at least one digit");
    }
    let result = 0n;
    const baseBigInt = BigInt(this.#radix);
    for (const char of str) {
      if (!this.#charMap.has(char)) {
        throw new Error(`Invalid character '${char}' for ${this.#name} (base ${this.#base})`);
      }
      const digitValue = BigInt(this.#charMap.get(char));
      result = result * baseBigInt + digitValue;
    }
    return negative ? -result : result;
  }
  fromDecimal(value) {
    if (typeof value !== "bigint") {
      throw new Error("Value must be a BigInt");
    }
    if (value === 0n) {
      const zero = this.#characters.find((character) => this.#charMap.get(character) === 0);
      if (zero !== undefined)
        return zero;
      throw new Error(`${this.#name} has no representation for zero`);
    }
    if (value < 0n && this.#radix > 0 && this.#digitOffset === 0) {
      return `-${this.fromDecimal(-value)}`;
    }
    if (value < 0n && this.#radix > 0 && this.#digitOffset > 0) {
      return `-${this.fromDecimal(-value)}`;
    }
    const radix = BigInt(this.#radix);
    const modulus = BigInt(Math.abs(this.#radix));
    const digitValues = this.#characters.map((character) => BigInt(this.#charMap.get(character)));
    const digits = [];
    let steps = 0;
    while (value !== 0n) {
      const residue = (value % modulus + modulus) % modulus;
      const index = digitValues.findIndex((digit2) => (digit2 % modulus + modulus) % modulus === residue);
      if (index < 0)
        throw new Error(`No digit in ${this.#name} can encode residue ${residue}`);
      const digit = digitValues[index];
      digits.unshift(this.#characters[index]);
      value = (value - digit) / radix;
      if (++steps > 1e5)
        throw new Error(`${this.#name} conversion did not converge`);
    }
    return digits.join("");
  }
  isValidString(str) {
    if (typeof str !== "string") {
      return false;
    }
    if (str.startsWith("-")) {
      str = str.slice(1);
    }
    if (str.length === 0) {
      return false;
    }
    for (const char of str) {
      if (!this.#charMap.has(char)) {
        return false;
      }
    }
    return true;
  }
  getMaxDigit() {
    return this.#characters[this.#characters.length - 1];
  }
  getMinDigit() {
    return this.#characters[0];
  }
  toString() {
    const charPreview = this.#characters.length <= 20 ? this.#characters.join("") : this.#characters.slice(0, 10).join("") + "..." + this.#characters.slice(-10).join("");
    return `${this.#name} (${charPreview})`;
  }
  equals(other) {
    if (!(other instanceof BaseSystem)) {
      return false;
    }
    if (this.#base !== other.#base || this.#radix !== other.#radix || this.#digitOffset !== other.#digitOffset) {
      return false;
    }
    for (let i = 0;i < this.#characters.length; i++) {
      if (this.#characters[i] !== other.#characters[i]) {
        return false;
      }
    }
    return true;
  }
  static fromBase(base, name) {
    if (!Number.isInteger(base) || base < 2) {
      throw new Error("Base must be an integer >= 2");
    }
    const characters = [];
    if (base <= 62) {
      for (let i = 0;i < Math.min(base, 10); i++) {
        characters.push(String.fromCharCode(48 + i));
      }
      if (base > 10) {
        for (let i = 0;i < Math.min(base - 10, 26); i++) {
          characters.push(String.fromCharCode(97 + i));
        }
      }
      if (base > 36) {
        for (let i = 0;i < base - 36; i++) {
          characters.push(String.fromCharCode(65 + i));
        }
      }
    } else {
      throw new Error("BaseSystem.fromBase() only supports bases up to 62. Use constructor with custom character sequence for larger bases.");
    }
    return new BaseSystem(characters, name || `Base ${base}`);
  }
  static createPattern(pattern, size, name) {
    const characters = [];
    switch (pattern.toLowerCase()) {
      case "alphanumeric":
        if (size > 62) {
          throw new Error(`Alphanumeric pattern only supports up to base 62, got ${size}`);
        }
        return BaseSystem.fromBase(size, name);
      case "digits-only":
        if (size > 10) {
          throw new Error(`Digits-only pattern only supports up to base 10, got ${size}`);
        }
        for (let i = 0;i < size; i++)
          characters.push(String.fromCharCode(48 + i));
        return new BaseSystem(characters, name || `Base ${size} (digits only)`);
      case "letters-only":
        if (size > 52) {
          throw new Error(`Letters-only pattern only supports up to base 52, got ${size}`);
        }
        for (let i = 0;i < Math.min(size, 26); i++) {
          characters.push(String.fromCharCode(97 + i));
        }
        if (size > 26) {
          for (let i = 0;i < size - 26; i++) {
            characters.push(String.fromCharCode(65 + i));
          }
        }
        return new BaseSystem(characters, name || (size <= 26 ? `Base ${size} (lowercase letters)` : `Base ${size} (mixed case letters)`));
      case "uppercase-only":
        if (size > 26) {
          throw new Error(`Uppercase-only pattern only supports up to base 26, got ${size}`);
        }
        for (let i = 0;i < size; i++) {
          characters.push(String.fromCharCode(65 + i));
        }
        return new BaseSystem(characters, name || `Base ${size} (uppercase letters)`);
      default:
        throw new Error(`Unknown pattern: ${pattern}. Supported patterns: alphanumeric, digits-only, letters-only, uppercase-only`);
    }
  }
  static registerPrefix(prefix, baseSystem) {
    if (typeof prefix !== "string" || prefix.length !== 1) {
      throw new Error("Prefix must be a single character");
    }
    if (!(baseSystem instanceof BaseSystem)) {
      throw new Error("Must provide a valid BaseSystem");
    }
    if (!/^[a-zA-Z]$/.test(prefix)) {
      throw new Error("Prefix must be a letter");
    }
    BaseSystem.#prefixMap.set(prefix, baseSystem);
  }
  static unregisterPrefix(prefix) {
    BaseSystem.#prefixMap.delete(prefix);
  }
  static hasExactPrefix(prefix) {
    return BaseSystem.#prefixMap.has(prefix);
  }
  static getSystemForPrefix(prefix) {
    if (prefix === "D")
      return null;
    if (BaseSystem.#prefixMap.has(prefix)) {
      return BaseSystem.#prefixMap.get(prefix);
    }
    const lower = prefix.toLowerCase();
    if (BaseSystem.#prefixMap.has(lower)) {
      if (lower === "d" && prefix !== "d")
        return;
      return BaseSystem.#prefixMap.get(lower);
    }
    return;
  }
  static getPrefixForSystem(baseSystem) {
    for (const [prefix, system] of BaseSystem.#prefixMap.entries()) {
      if (system.equals(baseSystem)) {
        return prefix;
      }
    }
    return;
  }
  withCaseSensitivity(caseSensitive) {
    if (caseSensitive === true) {
      return this;
    }
    if (caseSensitive === false) {
      const lowerChars = this.#characters.map((char) => char.toLowerCase());
      const uniqueLowerChars = [...new Set(lowerChars)];
      const collapsed = uniqueLowerChars.length !== lowerChars.length;
      if (collapsed) {
        console.warn("Case-insensitive conversion resulted in duplicate characters");
      }
      return new BaseSystem(uniqueLowerChars.join(""), `${this.#name} (case-insensitive)`, collapsed ? { allowReserved: this.#allowReserved } : {
        radix: this.#radix,
        digitOffset: this.#digitOffset,
        allowReserved: this.#allowReserved
      });
    }
    throw new Error("caseSensitive must be a boolean value");
  }
  toJSON() {
    return {
      $ratmath: "BaseSystem",
      characters: this.#characters,
      name: this.#name,
      radix: this.#radix,
      digitOffset: this.#digitOffset,
      allowReserved: this.#allowReserved
    };
  }
}
BaseSystem.BINARY = new BaseSystem(["0", "1"], "Binary");
BaseSystem.TERNARY = new BaseSystem(["0", "1", "2"], "Ternary");
BaseSystem.QUATERNARY = new BaseSystem(["0", "1", "2", "3"], "Quaternary");
BaseSystem.QUINARY = new BaseSystem(["0", "1", "2", "3", "4"], "Quinary (Base 5)");
BaseSystem.SEPTENARY = new BaseSystem(["0", "1", "2", "3", "4", "5", "6"], "Septenary (Base 7)");
BaseSystem.OCTAL = new BaseSystem(["0", "1", "2", "3", "4", "5", "6", "7"], "Octal");
BaseSystem.DECIMAL = new BaseSystem(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], "Decimal");
BaseSystem.DUODECIMAL = new BaseSystem(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b"], "Duodecimal (Clock/Base 12)");
BaseSystem.HEXADECIMAL = new BaseSystem(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"], "Hexadecimal");
BaseSystem.VIGESIMAL = new BaseSystem("0123456789abcdefghij".split(""), "Vigesimal (Base 20)");
BaseSystem.BASE36 = new BaseSystem("0123456789abcdefghijklmnopqrstuvwxyz".split(""), "Base 36 (URL)");
BaseSystem.BASE62 = new BaseSystem("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "Base 62");
BaseSystem.BASE64 = new BaseSystem("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@&".split(""), "Base 64");
BaseSystem.BASE60 = new BaseSystem("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWX".split(""), "Base 60 (Mesopotamia)");
BaseSystem.ROMAN = new BaseSystem(["I", "V", "X", "L", "C", "D", "M"], "Roman Numerals");
BaseSystem.registerPrefix("b", BaseSystem.BINARY);
BaseSystem.registerPrefix("t", BaseSystem.TERNARY);
BaseSystem.registerPrefix("q", BaseSystem.QUATERNARY);
BaseSystem.registerPrefix("f", BaseSystem.QUINARY);
BaseSystem.registerPrefix("s", BaseSystem.SEPTENARY);
BaseSystem.registerPrefix("o", BaseSystem.OCTAL);
BaseSystem.registerPrefix("d", BaseSystem.DUODECIMAL);
BaseSystem.registerPrefix("x", BaseSystem.HEXADECIMAL);
BaseSystem.registerPrefix("v", BaseSystem.VIGESIMAL);
BaseSystem.registerPrefix("u", BaseSystem.BASE36);
BaseSystem.registerPrefix("m", BaseSystem.BASE60);
BaseSystem.registerPrefix("y", BaseSystem.BASE64);

// ../../packages/core/src/bigint.js
function toExactBigInt(value, label = "Value") {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`${label} must be a safe integer; use a string or bigint for exact values`);
    }
    return BigInt(value);
  }
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "string" && /^[+-]?\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }
  throw new TypeError(`${label} must be an integer number, string, or bigint`);
}

// ../../packages/core/src/rational.js
var POWERS_OF_5 = Object.freeze({
  16: 5n ** 16n,
  8: 5n ** 8n,
  4: 5n ** 4n,
  2: 5n ** 2n,
  1: 5n
});
var bitLength = function(int) {
  if (int === 0n)
    return 0;
  return int < 0n ? (-int).toString(2).length : int.toString(2).length;
};
var roundedQuotient = function(numerator, denominator, mode) {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n || mode === "toward-zero")
    return quotient;
  if (mode === "floor")
    return numerator < 0n ? quotient - 1n : quotient;
  if (mode === "ceil")
    return numerator > 0n ? quotient + 1n : quotient;
  const twiceRemainder = (remainder < 0n ? -remainder : remainder) * 2n;
  if (twiceRemainder < denominator)
    return quotient;
  const direction = numerator < 0n ? -1n : 1n;
  if (twiceRemainder > denominator || mode === "half-up") {
    return quotient + direction;
  }
  return quotient % 2n === 0n ? quotient : quotient + direction;
};
var continuedFractionOptions = function(options, defaultLimit) {
  if (options === undefined) {
    return { maxTerms: defaultLimit, long: false };
  }
  if (typeof options === "number") {
    return { maxTerms: options, long: false };
  }
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Continued-fraction options must be a number or an object");
  }
  const maxTerms = options.maxTerms ?? defaultLimit;
  const long = options.long ?? false;
  if (typeof long !== "boolean") {
    throw new TypeError("Continued-fraction long option must be a boolean");
  }
  return { maxTerms, long };
};
var convergentOptions = function(options, defaultLimit) {
  if (options === undefined) {
    return { maxCount: defaultLimit, long: false, intermediates: false };
  }
  if (typeof options === "number") {
    return { maxCount: options, long: false, intermediates: false };
  }
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Convergent options must be a number or an object");
  }
  const maxCount = options.maxCount ?? defaultLimit;
  const long = options.long ?? false;
  const intermediates = options.intermediates ?? false;
  if (typeof long !== "boolean") {
    throw new TypeError("Convergent long option must be a boolean");
  }
  if (typeof intermediates !== "boolean") {
    throw new TypeError("Convergent intermediates option must be a boolean");
  }
  return { maxCount, long, intermediates };
};

class Rational {
  #numerator;
  #denominator;
  #isNegative;
  #wholePart;
  #remainder;
  #initialSegment;
  #periodDigits;
  #periodLength;
  #isTerminating;
  #factorsOf2;
  #factorsOf5;
  #leadingZerosInPeriod;
  #initialSegmentLeadingZeros;
  #initialSegmentRest;
  #periodDigitsRest;
  #maxPeriodDigitsComputed;
  #maxPeriodCheckComputed;
  static MAX_PERIOD_DIGITS = 30;
  static MAX_PERIOD_CHECK = 1e7;
  static DEFAULT_DECIMAL_DIGITS = 20;
  static DEFAULT_SCIENTIFIC_PRECISION = 11;
  static DEFAULT_BASE_LIMIT = 1000;
  static DEFAULT_PERIOD_MODULO_LIMIT = 1e6;
  static zero = new Rational(0, 1);
  static one = new Rational(1, 1);
  constructor(numerator, denominator = 1n) {
    if (numerator instanceof Rational) {
      this.#numerator = numerator.numerator;
      this.#denominator = numerator.denominator;
      this.#isNegative = this.#numerator < 0n;
      return;
    }
    if (numerator && typeof numerator === "object" && numerator.constructor.name === "Integer") {
      this.#numerator = numerator.value;
      if (denominator && typeof denominator === "object" && denominator.constructor.name === "Integer") {
        this.#denominator = denominator.value;
      } else if (denominator !== undefined) {
        this.#denominator = toExactBigInt(denominator, "Rational denominator");
      } else {
        this.#denominator = 1n;
      }
      if (this.#denominator === 0n) {
        throw new Error("Denominator cannot be zero");
      }
      this.#normalize();
      this.#isNegative = this.#numerator < 0n;
      return;
    }
    if (typeof numerator === "string") {
      if (numerator.includes("..")) {
        const mixed = numerator.trim().match(/^([+-]?)(\d+)\.\.(\d+)\/(\d+)$/);
        if (!mixed) {
          throw new Error("Invalid mixed number format. Use 'a..b/c'");
        }
        const sign = mixed[1] === "-" ? -1n : 1n;
        const wholePart = BigInt(mixed[2]);
        const fracNumerator = BigInt(mixed[3]);
        const fracDenominator = BigInt(mixed[4]);
        if (fracDenominator === 0n) {
          throw new Error("Denominator cannot be zero");
        }
        this.#numerator = sign * (wholePart * fracDenominator + fracNumerator);
        this.#denominator = fracDenominator;
      } else {
        if (numerator.includes(".")) {
          const expandedNumerator = Rational.#parseRepeatedDigits(numerator);
          const decimalParts = expandedNumerator.trim().split(".");
          if (decimalParts.length === 2) {
            const integerPart = decimalParts[0] || "0";
            const fractionalPart = decimalParts[1];
            if (!/^-?\d*$/.test(integerPart) || !/^\d*$/.test(fractionalPart)) {
              throw new Error("Invalid decimal format");
            }
            const isNegative = integerPart.startsWith("-");
            const wholePart = BigInt(integerPart);
            const fractionalValue = BigInt(fractionalPart);
            const denomValue = 10n ** BigInt(fractionalPart.length);
            this.#numerator = wholePart * denomValue + (isNegative ? -fractionalValue : fractionalValue);
            this.#denominator = denomValue;
          } else {
            throw new Error("Invalid decimal format - multiple decimal points");
          }
        } else {
          const parts = numerator.trim().split("/");
          if (parts.length === 1) {
            this.#numerator = BigInt(parts[0]);
            this.#denominator = toExactBigInt(denominator, "Rational denominator");
          } else if (parts.length === 2) {
            this.#numerator = BigInt(parts[0]);
            this.#denominator = BigInt(parts[1]);
          } else {
            throw new Error("Invalid rational format. Use 'a/b', 'a', or 'a..b/c'");
          }
        }
      }
    } else {
      this.#numerator = toExactBigInt(numerator, "Rational numerator");
      this.#denominator = toExactBigInt(denominator, "Rational denominator");
    }
    if (this.#denominator === 0n) {
      throw new Error("Denominator cannot be zero");
    }
    this.#normalize();
    this.#isNegative = this.#numerator < 0n;
  }
  #normalize() {
    if (this.#denominator < 0n) {
      this.#numerator = -this.#numerator;
      this.#denominator = -this.#denominator;
    }
    if (this.#numerator === 0n) {
      this.#denominator = 1n;
      return;
    }
    const gcd = this.#gcd(this.#numerator < 0n ? -this.#numerator : this.#numerator, this.#denominator);
    this.#numerator = this.#numerator / gcd;
    this.#denominator = this.#denominator / gcd;
  }
  #gcd(a, b) {
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
  get numerator() {
    return this.#numerator;
  }
  get denominator() {
    return this.#denominator;
  }
  add(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("add", this);
    }
    if (other.constructor.name === "Integer") {
      const otherAsRational = new Rational(other.value, 1n);
      return this.add(otherAsRational);
    } else if (other instanceof Rational) {
      const a = this.#numerator;
      const b = this.#denominator;
      const c = other.numerator;
      const d = other.denominator;
      const numerator = a * d + b * c;
      const denominator = b * d;
      return new Rational(numerator, denominator);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const thisAsInterval = { low: this, high: this };
      const IntervalClass = other.constructor;
      const newThisAsInterval = new IntervalClass(this, this);
      return newThisAsInterval.add(other);
    } else {
      throw new Error(`Cannot add ${other.constructor.name} to Rational`);
    }
  }
  subtract(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("subtract", this);
    }
    if (other.constructor.name === "Integer") {
      const otherAsRational = new Rational(other.value, 1n);
      return this.subtract(otherAsRational);
    } else if (other instanceof Rational) {
      const a = this.#numerator;
      const b = this.#denominator;
      const c = other.numerator;
      const d = other.denominator;
      const numerator = a * d - b * c;
      const denominator = b * d;
      return new Rational(numerator, denominator);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const IntervalClass = other.constructor;
      const newThisAsInterval = new IntervalClass(this, this);
      return newThisAsInterval.subtract(other);
    } else {
      throw new Error(`Cannot subtract ${other.constructor.name} from Rational`);
    }
  }
  multiply(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("multiply", this);
    }
    if (other.constructor.name === "Integer") {
      const otherAsRational = new Rational(other.value, 1n);
      return this.multiply(otherAsRational);
    } else if (other instanceof Rational) {
      const a = this.#numerator;
      const b = this.#denominator;
      const c = other.numerator;
      const d = other.denominator;
      const numerator = a * c;
      const denominator = b * d;
      return new Rational(numerator, denominator);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const IntervalClass = other.constructor;
      const newThisAsInterval = new IntervalClass(this, this);
      return newThisAsInterval.multiply(other);
    } else {
      throw new Error(`Cannot multiply Rational by ${other.constructor.name}`);
    }
  }
  divide(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("divide", this);
    }
    if (other.constructor.name === "Integer") {
      if (other.value === 0n) {
        throw new Error("Division by zero");
      }
      const otherAsRational = new Rational(other.value, 1n);
      return this.divide(otherAsRational);
    } else if (other instanceof Rational) {
      if (other.numerator === 0n) {
        throw new Error("Division by zero");
      }
      const a = this.#numerator;
      const b = this.#denominator;
      const c = other.numerator;
      const d = other.denominator;
      const numerator = a * d;
      const denominator = b * c;
      return new Rational(numerator, denominator);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const IntervalClass = other.constructor;
      const newThisAsInterval = new IntervalClass(this, this);
      return newThisAsInterval.divide(other);
    } else {
      throw new Error(`Cannot divide Rational by ${other.constructor.name}`);
    }
  }
  possibleRelationsTo(other) {
    if (other?.isCertifiedApproximation === true)
      other = other.enclosure;
    if (other?.constructor?.name === "Integer")
      other = new Rational(other.value, 1n);
    if (other instanceof Rational)
      return this.lessThan(other) ? 1 : this.greaterThan(other) ? 4 : 2;
    if (other?.low && other?.high) {
      let mask = 0;
      if (this.lessThan(other.high))
        mask |= 1;
      if (other.low.lessThanOrEqual(this) && this.lessThanOrEqual(other.high))
        mask |= 2;
      if (this.greaterThan(other.low))
        mask |= 4;
      return mask;
    }
    throw new TypeError("Possible relations require a Core numeric value");
  }
  negate() {
    return new Rational(-this.#numerator, this.#denominator);
  }
  reciprocal() {
    if (this.#numerator === 0n) {
      throw new Error("Cannot take reciprocal of zero");
    }
    return new Rational(this.#denominator, this.#numerator);
  }
  pow(exponent) {
    const n = toExactBigInt(exponent, "Exponent");
    if (n === 0n) {
      if (this.#numerator === 0n) {
        throw new Error("Zero cannot be raised to the power of zero");
      }
      return new Rational(1);
    }
    if (this.#numerator === 0n && n < 0n) {
      throw new Error("Zero cannot be raised to a negative power");
    }
    if (n < 0n) {
      const reciprocal = this.reciprocal();
      return reciprocal.pow(-n);
    }
    let resultNum = 1n;
    let resultDen = 1n;
    let num = this.#numerator;
    let den = this.#denominator;
    for (let i = n < 0n ? -n : n;i > 0n; i >>= 1n) {
      if (i & 1n) {
        resultNum *= num;
        resultDen *= den;
      }
      num *= num;
      den *= den;
    }
    return new Rational(resultNum, resultDen);
  }
  equals(other) {
    return this.#numerator === other.numerator && this.#denominator === other.denominator;
  }
  compareTo(other) {
    const crossProduct1 = this.#numerator * other.denominator;
    const crossProduct2 = this.#denominator * other.numerator;
    if (crossProduct1 < crossProduct2)
      return -1;
    if (crossProduct1 > crossProduct2)
      return 1;
    return 0;
  }
  lessThan(other) {
    return this.compareTo(other) < 0;
  }
  lessThanOrEqual(other) {
    return this.compareTo(other) <= 0;
  }
  greaterThan(other) {
    return this.compareTo(other) > 0;
  }
  greaterThanOrEqual(other) {
    return this.compareTo(other) >= 0;
  }
  abs() {
    return this.#numerator < 0n ? this.negate() : new Rational(this.#numerator, this.#denominator);
  }
  floor() {
    return roundedQuotient(this.#numerator, this.#denominator, "floor");
  }
  ceil() {
    return roundedQuotient(this.#numerator, this.#denominator, "ceil");
  }
  trunc() {
    return roundedQuotient(this.#numerator, this.#denominator, "toward-zero");
  }
  round(mode = "half-even") {
    if (!new Set(["half-even", "half-up", "toward-zero", "floor", "ceil"]).has(mode)) {
      throw new TypeError("Unknown rounding mode");
    }
    return roundedQuotient(this.#numerator, this.#denominator, mode);
  }
  roundTo(places, mode = "half-even") {
    if (!Number.isSafeInteger(places)) {
      throw new RangeError("Decimal places must be a safe integer");
    }
    if (!new Set(["half-even", "half-up", "toward-zero", "floor", "ceil"]).has(mode)) {
      throw new TypeError("Unknown rounding mode");
    }
    const scale = 10n ** BigInt(Math.abs(places));
    if (places >= 0) {
      return new Rational(roundedQuotient(this.#numerator * scale, this.#denominator, mode), scale);
    }
    return new Rational(roundedQuotient(this.#numerator, this.#denominator * scale, mode) * scale);
  }
  toJSON() {
    return {
      $ratmath: "Rational",
      numerator: this.#numerator.toString(),
      denominator: this.#denominator.toString()
    };
  }
  toString(base, options) {
    if (base === undefined) {
      if (this.#denominator === 1n) {
        return this.#numerator.toString();
      }
      return `${this.#numerator}/${this.#denominator}`;
    }
    let baseSystem;
    if (base instanceof BaseSystem) {
      baseSystem = base;
    } else if (typeof base === "number") {
      baseSystem = BaseSystem.fromBase(base);
    } else {
      return this.toString();
    }
    return this.toRepeatingBase(baseSystem, options);
  }
  toRepeatingBase(baseSystem, options) {
    return this.toRepeatingBaseWithPeriod(baseSystem, options).baseStr;
  }
  toRepeatingBaseWithPeriod(baseSystem, options = {}) {
    if (!(baseSystem instanceof BaseSystem)) {
      throw new Error("Argument must be a BaseSystem");
    }
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("Base-expansion options must be an object");
    }
    const {
      useRepeatNotation = true,
      limit = Rational.DEFAULT_BASE_LIMIT
    } = options;
    if (typeof useRepeatNotation !== "boolean") {
      throw new TypeError("Base-expansion useRepeatNotation option must be a boolean");
    }
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new RangeError("Base-expansion limit must be a positive safe integer");
    }
    if (!baseSystem.supportsPositionalFractions) {
      if (this.#denominator === 1n) {
        return {
          baseStr: baseSystem.fromDecimal(this.#numerator),
          period: 0,
          limitHit: false
        };
      }
      throw new RangeError("Fractional radix expansion requires a conventional positional BaseSystem; use toBase() for an exact fraction");
    }
    if (this.#numerator < 0n) {
      const result2 = this.negate().toRepeatingBaseWithPeriod(baseSystem, options);
      return {
        baseStr: "-" + result2.baseStr,
        period: result2.period,
        limitHit: result2.limitHit
      };
    }
    const baseBigInt = BigInt(baseSystem.base);
    let num = this.#numerator;
    let den = this.#denominator;
    const integerPart = num / den;
    let remainder = num % den;
    let result = baseSystem.fromDecimal(integerPart);
    if (remainder === 0n) {
      return { baseStr: result, period: 0, limitHit: false };
    }
    result += ".";
    const remainders = new Map;
    let fractionParts = [];
    let cycleStartIndex = -1;
    let limitHit = false;
    while (remainder !== 0n) {
      if (remainders.has(remainder)) {
        cycleStartIndex = remainders.get(remainder);
        break;
      }
      if (fractionParts.length >= limit) {
        limitHit = true;
        break;
      }
      remainders.set(remainder, fractionParts.length);
      remainder *= baseBigInt;
      const digit = remainder / den;
      remainder = remainder % den;
      fractionParts.push(baseSystem.getChar(digit));
    }
    let period = 0;
    if (cycleStartIndex !== -1) {
      const nonRepeating = fractionParts.slice(0, cycleStartIndex).join("");
      const repeating = fractionParts.slice(cycleStartIndex).join("");
      period = fractionParts.length - cycleStartIndex;
      const formattedNonRepeating = useRepeatNotation ? Rational.#formatRepeatedDigits(nonRepeating) : nonRepeating;
      const formattedRepeating = useRepeatNotation ? Rational.#formatRepeatedDigits(repeating) : repeating;
      result += formattedNonRepeating + "#" + formattedRepeating;
    } else if (remainder === 0n) {
      const terminating = fractionParts.join("");
      const formattedTerminating = useRepeatNotation ? Rational.#formatRepeatedDigits(terminating) : terminating;
      result += formattedTerminating + "#0";
    } else {
      const partial = fractionParts.join("");
      const formattedPartial = useRepeatNotation ? Rational.#formatRepeatedDigits(partial) : partial;
      result += formattedPartial + "...";
      period = -1;
    }
    return { baseStr: result, period, limitHit };
  }
  periodModulo(baseSystem, limit = Rational.DEFAULT_PERIOD_MODULO_LIMIT) {
    if (!(baseSystem instanceof BaseSystem)) {
      throw new Error("Argument must be a BaseSystem");
    }
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new RangeError("Period limit must be a positive safe integer");
    }
    let den = this.#denominator;
    if (den === 1n)
      return 0;
    if (!baseSystem.supportsPositionalFractions) {
      throw new RangeError("Period calculation requires a conventional positional BaseSystem");
    }
    const baseBigInt = BigInt(baseSystem.base);
    let common = this.#gcd(den, baseBigInt);
    while (common > 1n) {
      den /= common;
      common = this.#gcd(den, baseBigInt);
    }
    if (den === 1n)
      return 0;
    let k = 1;
    let power = baseBigInt % den;
    while (power !== 1n && k <= limit) {
      power = power * baseBigInt % den;
      k++;
    }
    if (k > limit) {
      throw new Error(`Period calculation exceeded limit of ${limit} iterations. Period is likely > ${limit}.`);
    }
    return k;
  }
  toBase(baseSystem) {
    if (!(baseSystem instanceof BaseSystem)) {
      throw new Error("Argument must be a BaseSystem");
    }
    const numStr = baseSystem.fromDecimal(this.#numerator);
    if (this.#denominator === 1n) {
      return numStr;
    }
    const denStr = baseSystem.fromDecimal(this.#denominator);
    return `${numStr}/${denStr}`;
  }
  toMixedString() {
    if (this.#denominator === 1n || this.#numerator === 0n) {
      return this.#numerator.toString();
    }
    this.#computeWholePart();
    if (this.#remainder === 0n) {
      return this.#isNegative ? `-${this.#wholePart}` : `${this.#wholePart}`;
    }
    if (this.#wholePart === 0n) {
      return this.#isNegative ? `-${this.#remainder}/${this.#denominator}` : `${this.#remainder}/${this.#denominator}`;
    } else {
      return this.#isNegative ? `-${this.#wholePart}..${this.#remainder}/${this.#denominator}` : `${this.#wholePart}..${this.#remainder}/${this.#denominator}`;
    }
  }
  toNumber() {
    return Number(this.#numerator) / Number(this.#denominator);
  }
  toRepeatingDecimal(limit = Rational.MAX_PERIOD_DIGITS, onLimit = "error") {
    const result = this.toRepeatingDecimalWithPeriod({ limit, onLimit });
    return result.decimal;
  }
  toRepeatingDecimalWithPeriod(options = true, legacyLimit, legacyOnLimit) {
    if (typeof options !== "boolean" && (options === null || typeof options !== "object" || Array.isArray(options))) {
      throw new TypeError("Repeating-decimal options must be a boolean or an object");
    }
    const normalized = typeof options === "boolean" ? {
      useRepeatNotation: options,
      limit: legacyLimit ?? Rational.MAX_PERIOD_DIGITS,
      onLimit: legacyOnLimit ?? "error"
    } : {
      useRepeatNotation: options?.useRepeatNotation ?? true,
      limit: options?.limit ?? Rational.MAX_PERIOD_DIGITS,
      onLimit: options?.onLimit ?? "error"
    };
    const { useRepeatNotation, limit, onLimit } = normalized;
    if (typeof useRepeatNotation !== "boolean") {
      throw new TypeError("Repeating-decimal useRepeatNotation option must be a boolean");
    }
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new RangeError("Repeating-decimal limit must be a positive safe integer");
    }
    if (!new Set(["trunc", "null", "error"]).has(onLimit)) {
      throw new TypeError('onLimit must be "trunc", "null", or "error"');
    }
    if (this.#numerator === 0n) {
      return { decimal: "0", period: 0, truncated: false };
    }
    this.#computeWholePart();
    this.#computeDecimalMetadata(limit);
    let result = (this.#isNegative ? "-" : "") + this.#wholePart.toString();
    if (this.#isTerminating) {
      if (this.#initialSegment) {
        const formattedInitial = useRepeatNotation ? Rational.#formatRepeatedDigits(this.#initialSegment, 7) : this.#initialSegment;
        result += "." + formattedInitial + "#0";
      }
      return { decimal: result, period: 0, truncated: false };
    } else {
      const overLimit = this.#periodLength === -1 || this.#periodLength > limit;
      if (overLimit) {
        if (onLimit === "null") {
          return { decimal: null, period: this.#periodLength, truncated: true };
        }
        if (onLimit === "error") {
          const period = this.#periodLength === -1 ? `more than ${Rational.MAX_PERIOD_CHECK.toLocaleString()}` : this.#periodLength.toString();
          throw new RangeError(`Repeating decimal period is ${period} digits, exceeding limit ${limit}`);
        }
        const initial = useRepeatNotation ? Rational.#formatRepeatedDigits(this.#initialSegment, 7) : this.#initialSegment;
        const periodPrefix = this.#periodDigits.slice(0, limit);
        const decimal = `${result}.${initial}#${periodPrefix}...`;
        return { decimal, period: this.#periodLength, truncated: true };
      }
      const periodDigits = this.#periodDigits;
      const formattedInitial = useRepeatNotation ? Rational.#formatRepeatedDigits(this.#initialSegment, 7) : this.#initialSegment;
      const displayPeriod = useRepeatNotation ? Rational.#formatRepeatedDigits(periodDigits, 7) : periodDigits;
      if (this.#initialSegment) {
        result += "." + formattedInitial + "#" + displayPeriod;
      } else {
        result += ".#" + displayPeriod;
      }
      return {
        decimal: result,
        period: this.#periodLength,
        truncated: false
      };
    }
  }
  static #countFactorsOf2(n) {
    if (n === 0n)
      return 0;
    let count = 0;
    while ((n & 1n) === 0n) {
      n >>= 1n;
      count++;
    }
    return count;
  }
  static #countFactorsOf5(n) {
    if (n === 0n)
      return 0;
    let count = 0;
    const powers = [
      { exp: 16, value: POWERS_OF_5["16"] },
      { exp: 8, value: POWERS_OF_5["8"] },
      { exp: 4, value: POWERS_OF_5["4"] },
      { exp: 2, value: POWERS_OF_5["2"] },
      { exp: 1, value: POWERS_OF_5["1"] }
    ];
    for (const { exp, value } of powers) {
      while (n % value === 0n) {
        n /= value;
        count += exp;
      }
    }
    return count;
  }
  #computeWholePart() {
    if (this.#wholePart !== undefined)
      return;
    const absNumerator = this.#numerator < 0n ? -this.#numerator : this.#numerator;
    this.#wholePart = absNumerator / this.#denominator;
    this.#remainder = absNumerator % this.#denominator;
  }
  #computeLeadingZerosInPeriod(periodRemainder) {
    if (periodRemainder * 10n >= this.#denominator)
      return 0;
    let firstNonzeroPosition = this.#denominator.toString().length - periodRemainder.toString().length;
    if (periodRemainder * 10n ** BigInt(firstNonzeroPosition) < this.#denominator) {
      firstNonzeroPosition += 1;
    }
    return Math.max(0, firstNonzeroPosition - 1);
  }
  #computeDecimalMetadata(maxPeriodDigits = Rational.MAX_PERIOD_DIGITS) {
    if (this.#periodLength !== undefined && this.#maxPeriodDigitsComputed !== undefined && this.#maxPeriodDigitsComputed >= maxPeriodDigits && this.#maxPeriodCheckComputed === Rational.MAX_PERIOD_CHECK)
      return;
    this.#computeWholePart();
    if (this.#remainder === 0n) {
      this.#initialSegment = "";
      this.#periodDigits = "";
      this.#periodLength = 0;
      this.#isTerminating = true;
      this.#factorsOf2 = 0;
      this.#factorsOf5 = 0;
      this.#leadingZerosInPeriod = 0;
      this.#initialSegmentLeadingZeros = 0;
      this.#initialSegmentRest = "";
      this.#periodDigitsRest = "";
      this.#maxPeriodDigitsComputed = maxPeriodDigits;
      this.#maxPeriodCheckComputed = Rational.MAX_PERIOD_CHECK;
      return;
    }
    this.#factorsOf2 = Rational.#countFactorsOf2(this.#denominator);
    this.#factorsOf5 = Rational.#countFactorsOf5(this.#denominator);
    const initialSegmentLength = Math.max(this.#factorsOf2, this.#factorsOf5);
    let reducedDen = this.#denominator;
    for (let i = 0;i < this.#factorsOf2; i++) {
      reducedDen /= 2n;
    }
    for (let i = 0;i < this.#factorsOf5; i++) {
      reducedDen /= 5n;
    }
    if (reducedDen === 1n) {
      const digits = [];
      let currentRemainder2 = this.#remainder;
      for (let i = 0;i < initialSegmentLength && currentRemainder2 !== 0n; i++) {
        currentRemainder2 *= 10n;
        const digit = currentRemainder2 / this.#denominator;
        digits.push(digit.toString());
        currentRemainder2 = currentRemainder2 % this.#denominator;
      }
      this.#initialSegment = digits.join("");
      this.#periodDigits = "";
      this.#periodLength = 0;
      this.#isTerminating = true;
      this.#leadingZerosInPeriod = 0;
      this.#computeDecimalPartBreakdown();
      this.#maxPeriodDigitsComputed = maxPeriodDigits;
      this.#maxPeriodCheckComputed = Rational.MAX_PERIOD_CHECK;
      return;
    }
    const maxPeriodCheck = Rational.MAX_PERIOD_CHECK;
    if (!Number.isSafeInteger(maxPeriodCheck) || maxPeriodCheck < 1) {
      throw new RangeError("Maximum period check must be a positive safe integer");
    }
    let periodLength = 1;
    let remainder = 10n % reducedDen;
    while (remainder !== 1n && periodLength < maxPeriodCheck) {
      periodLength++;
      remainder = remainder * 10n % reducedDen;
    }
    this.#periodLength = remainder === 1n ? periodLength : -1;
    this.#isTerminating = false;
    const initialDigits = [];
    let currentRemainder = this.#remainder;
    for (let i = 0;i < initialSegmentLength && currentRemainder !== 0n; i++) {
      currentRemainder *= 10n;
      const digit = currentRemainder / this.#denominator;
      initialDigits.push(digit.toString());
      currentRemainder = currentRemainder % this.#denominator;
    }
    this.#leadingZerosInPeriod = this.#computeLeadingZerosInPeriod(currentRemainder);
    const periodDigitsToCompute = this.#periodLength === -1 ? maxPeriodDigits : this.#periodLength > maxPeriodDigits ? maxPeriodDigits : this.#periodLength;
    const periodDigits = [];
    if (currentRemainder !== 0n) {
      for (let i = 0;i < periodDigitsToCompute; i++) {
        currentRemainder *= 10n;
        const digit = currentRemainder / this.#denominator;
        periodDigits.push(digit.toString());
        currentRemainder = currentRemainder % this.#denominator;
      }
    }
    this.#initialSegment = initialDigits.join("");
    this.#periodDigits = periodDigits.join("");
    this.#computeDecimalPartBreakdown();
    this.#maxPeriodDigitsComputed = maxPeriodDigits;
    this.#maxPeriodCheckComputed = maxPeriodCheck;
  }
  #computeDecimalPartBreakdown() {
    let leadingZeros = 0;
    const initialSegment = this.#initialSegment || "";
    for (let i = 0;i < initialSegment.length; i++) {
      if (initialSegment[i] === "0") {
        leadingZeros++;
      } else {
        break;
      }
    }
    this.#initialSegmentLeadingZeros = leadingZeros;
    this.#initialSegmentRest = initialSegment.substring(leadingZeros);
    const periodDigits = this.#periodDigits || "";
    this.#periodDigitsRest = periodDigits.substring(this.#leadingZerosInPeriod);
  }
  computeDecimalMetadata(maxPeriodDigits = Rational.MAX_PERIOD_DIGITS) {
    if (!Number.isSafeInteger(maxPeriodDigits) || maxPeriodDigits < 1) {
      throw new RangeError("Maximum period digits must be a positive safe integer");
    }
    if (this.#numerator === 0n) {
      return {
        initialSegment: "",
        periodDigits: "",
        periodLength: 0,
        isTerminating: true
      };
    }
    this.#computeDecimalMetadata(maxPeriodDigits);
    const periodDigits = this.#periodDigits.slice(0, maxPeriodDigits);
    return {
      wholePart: this.#wholePart,
      initialSegment: this.#initialSegment,
      initialSegmentLeadingZeros: this.#initialSegmentLeadingZeros,
      initialSegmentRest: this.#initialSegmentRest,
      periodDigits,
      periodLength: this.#periodLength,
      leadingZerosInPeriod: this.#leadingZerosInPeriod,
      periodDigitsRest: periodDigits.substring(this.#leadingZerosInPeriod),
      isTerminating: this.#isTerminating
    };
  }
  static #formatRepeatedDigits(digits, threshold = 6) {
    if (!digits || digits.length === 0)
      return digits;
    let result = "";
    let i = 0;
    while (i < digits.length) {
      let currentChar = digits[i];
      let count = 1;
      while (i + count < digits.length && digits[i + count] === currentChar) {
        count++;
      }
      if (count >= threshold) {
        result += `{${currentChar}~${count}}`;
      } else {
        result += currentChar.repeat(count);
      }
      i += count;
    }
    return result;
  }
  static #parseRepeatedDigits(formattedDigits) {
    if (!formattedDigits || !formattedDigits.includes("{")) {
      return formattedDigits;
    }
    return formattedDigits.replace(/\{(.+?)~(\d+)\}/g, (match, digits, count) => {
      return digits.repeat(parseInt(count));
    });
  }
  extractPeriodSegment(initialSegment, periodLength, digitsRequested) {
    if (periodLength === 0 || periodLength === -1) {
      return "";
    }
    const digitsToReturn = Math.min(digitsRequested, periodLength);
    const periodDigits = [];
    let currentRemainder = this.#numerator % this.#denominator;
    const isNegative = this.#numerator < 0n;
    if (isNegative) {
      currentRemainder = -currentRemainder;
    }
    for (let i = 0;i < initialSegment.length; i++) {
      currentRemainder *= 10n;
      currentRemainder = currentRemainder % this.#denominator;
    }
    for (let i = 0;i < digitsToReturn; i++) {
      currentRemainder *= 10n;
      const digit = currentRemainder / this.#denominator;
      periodDigits.push(digit.toString());
      currentRemainder = currentRemainder % this.#denominator;
    }
    return periodDigits.join("");
  }
  toDecimal(maxDigits = Rational.DEFAULT_DECIMAL_DIGITS) {
    if (!Number.isSafeInteger(maxDigits) || maxDigits < 1) {
      throw new RangeError("Decimal digit limit must be a positive safe integer");
    }
    if (this.#numerator === 0n) {
      return "0";
    }
    const isNegative = this.#numerator < 0n;
    const num = isNegative ? -this.#numerator : this.#numerator;
    const den = this.#denominator;
    const integerPart = num / den;
    let remainder = num % den;
    if (remainder === 0n) {
      return (isNegative ? "-" : "") + integerPart.toString();
    }
    const digits = [];
    for (let i = 0;i < maxDigits && remainder !== 0n; i++) {
      remainder *= 10n;
      const digit = remainder / den;
      digits.push(digit.toString());
      remainder = remainder % den;
    }
    let result = (isNegative ? "-" : "") + integerPart.toString();
    if (digits.length > 0) {
      result += "." + digits.join("");
    }
    return result;
  }
  E(exponent) {
    const exp = toExactBigInt(exponent, "Exponent");
    let powerOf10;
    if (exp >= 0n) {
      powerOf10 = new Rational(10n ** exp, 1n);
    } else {
      powerOf10 = new Rational(1n, 10n ** -exp);
    }
    return this.multiply(powerOf10);
  }
  #generatePeriodInfo(showPeriodInfo) {
    if (!showPeriodInfo || this.#isTerminating) {
      return "";
    }
    const info = [];
    if (this.#initialSegmentLeadingZeros > 0) {
      info.push(`initial: ${this.#initialSegmentLeadingZeros} zeros`);
    }
    if (this.#leadingZerosInPeriod > 0) {
      info.push(`period starts: +${this.#leadingZerosInPeriod} zeros`);
    }
    if (this.#periodLength === -1) {
      info.push(`period: >${Rational.MAX_PERIOD_CHECK.toLocaleString()}`);
    } else if (this.#periodLength > 0) {
      info.push(`period: ${this.#periodLength}`);
    }
    return info.length > 0 ? ` {${info.join(", ")}}` : "";
  }
  toScientificNotation(useRepeatNotation = true, precision = Rational.DEFAULT_SCIENTIFIC_PRECISION, showPeriodInfo = false) {
    if (typeof useRepeatNotation !== "boolean") {
      throw new TypeError("Scientific-notation useRepeatNotation must be a boolean");
    }
    if (typeof showPeriodInfo !== "boolean") {
      throw new TypeError("Scientific-notation showPeriodInfo must be a boolean");
    }
    if (!Number.isSafeInteger(precision) || precision < 1) {
      throw new RangeError("Scientific-notation precision must be a positive safe integer");
    }
    if (this.#numerator === 0n) {
      return "0";
    }
    this.#computeWholePart();
    this.#computeDecimalMetadata(precision);
    const prefix = this.#isNegative ? "-" : "";
    const format = (digits) => useRepeatNotation ? Rational.#formatRepeatedDigits(digits, 7) : digits;
    if (!this.#isTerminating && (this.#periodLength === -1 || this.#periodLength > precision)) {
      let numerator = this.#numerator < 0n ? -this.#numerator : this.#numerator;
      let denominator = this.#denominator;
      let exponent2 = 0;
      while (numerator >= denominator * 10n) {
        denominator *= 10n;
        exponent2 += 1;
      }
      while (numerator < denominator) {
        numerator *= 10n;
        exponent2 -= 1;
      }
      const digits = [];
      for (let i = 0;i < precision; i += 1) {
        digits.push((numerator / denominator).toString());
        numerator = numerator % denominator * 10n;
      }
      const mantissa2 = digits[0] + (digits.length > 1 ? `.${digits.slice(1).join("")}` : "") + "...";
      const result2 = `${prefix}${mantissa2}E${exponent2}`;
      return result2 + this.#generatePeriodInfo(showPeriodInfo);
    }
    const whole = this.#wholePart.toString();
    const period = this.#periodDigits;
    let firstDigit;
    let exponent;
    let nonRepeatingTail = "";
    let scientificPeriod = period;
    if (this.#wholePart > 0n) {
      firstDigit = whole[0];
      exponent = whole.length - 1;
      const wholeTail = whole.slice(1);
      nonRepeatingTail = wholeTail + this.#initialSegment;
    } else if (this.#initialSegmentRest !== "") {
      const index = this.#initialSegmentLeadingZeros;
      firstDigit = this.#initialSegment[index];
      exponent = -(index + 1);
      nonRepeatingTail = this.#initialSegment.slice(index + 1);
    } else {
      const index = period.search(/[1-9]/);
      firstDigit = period[index];
      exponent = -(this.#initialSegment.length + index + 1);
      scientificPeriod = period.slice(index + 1) + period.slice(0, index + 1);
    }
    if (!this.#isTerminating) {
      while (nonRepeatingTail.length > 0 && nonRepeatingTail.at(-1) === scientificPeriod.at(-1)) {
        nonRepeatingTail = nonRepeatingTail.slice(0, -1);
        scientificPeriod = scientificPeriod.at(-1) + scientificPeriod.slice(0, -1);
      }
    }
    if (this.#isTerminating) {
      const tail = nonRepeatingTail.replace(/0+$/, "");
      const shown = tail.slice(0, Math.max(0, precision - 1));
      const ellipsis = tail.length > shown.length ? "..." : "";
      return `${prefix}${firstDigit}${shown ? `.${shown}` : ""}${ellipsis}E${exponent}`;
    }
    const initial = format(nonRepeatingTail);
    const repeated = format(scientificPeriod);
    const mantissa = `${firstDigit}.${initial}#${repeated}`;
    const result = `${prefix}${mantissa}E${exponent}`;
    return result + this.#generatePeriodInfo(showPeriodInfo);
  }
  static from(value) {
    if (value instanceof Rational) {
      return new Rational(value.numerator, value.denominator);
    }
    return new Rational(value);
  }
  static DEFAULT_CF_LIMIT = 1000;
  static #continuedFractionArray(cfArray) {
    if (!Array.isArray(cfArray) || cfArray.length === 0) {
      throw new Error("Continued fraction array cannot be empty");
    }
    const cf = cfArray.map((term) => {
      if (typeof term === "number") {
        return toExactBigInt(term, "Continued fraction term");
      }
      if (typeof term === "bigint") {
        return term;
      }
      throw new Error(`Invalid continued fraction term: ${term}`);
    });
    for (let i = 1;i < cf.length; i++) {
      if (cf[i] <= 0n) {
        throw new Error(`Continued fraction terms must be positive: ${cf[i]}`);
      }
    }
    return cf;
  }
  static #continuedFractionString(cfString) {
    if (typeof cfString !== "string") {
      throw new TypeError("Continued fraction must be a string");
    }
    const cfMatch = cfString.match(/^(-?\d+)\.~(.*)$/);
    if (!cfMatch) {
      throw new Error("Invalid continued fraction format");
    }
    const [, integerPart, cfTermsStr] = cfMatch;
    const intPart = BigInt(integerPart);
    if (cfTermsStr === "0") {
      return [intPart];
    }
    if (cfTermsStr === "") {
      throw new Error("Continued fraction must have at least one term after .~");
    }
    if (cfTermsStr.endsWith("~")) {
      throw new Error("Continued fraction cannot end with ~");
    }
    if (cfTermsStr.includes("~~")) {
      throw new Error("Invalid continued fraction format: double tilde");
    }
    const cfTerms = cfTermsStr.split("~").map((term) => {
      if (!/^\d+$/.test(term)) {
        throw new Error(`Invalid continued fraction term: ${term}`);
      }
      const termValue = BigInt(term);
      if (termValue <= 0n) {
        throw new Error(`Continued fraction terms must be positive integers: ${term}`);
      }
      return termValue;
    });
    return [intPart, ...cfTerms];
  }
  static #convergentsForCoefficients(cf, maxCount, intermediates = false) {
    let previousPreviousNumerator = 0n;
    let previousNumerator = 1n;
    let previousPreviousDenominator = 1n;
    let previousDenominator = 0n;
    const convergents = [];
    for (let index = 0;index < cf.length; index++) {
      const coefficient = cf[index];
      let currentNumerator;
      let currentDenominator;
      if (index > 0 && intermediates) {
        for (let multiplier = 1n;multiplier <= coefficient; multiplier++) {
          currentNumerator = multiplier * previousNumerator + previousPreviousNumerator;
          currentDenominator = multiplier * previousDenominator + previousPreviousDenominator;
          convergents.push(new Rational(currentNumerator, currentDenominator));
          if (convergents.length >= maxCount) {
            return convergents;
          }
        }
      } else {
        currentNumerator = coefficient * previousNumerator + previousPreviousNumerator;
        currentDenominator = coefficient * previousDenominator + previousPreviousDenominator;
        convergents.push(new Rational(currentNumerator, currentDenominator));
        if (convergents.length >= maxCount) {
          return convergents;
        }
      }
      previousPreviousNumerator = previousNumerator;
      previousNumerator = currentNumerator;
      previousPreviousDenominator = previousDenominator;
      previousDenominator = currentDenominator;
    }
    return convergents;
  }
  static fromContinuedFraction(cfArray) {
    const cf = Rational.#continuedFractionArray(cfArray);
    if (cf.length === 1) {
      return new Rational(cf[0], 1n);
    }
    let p_prev = 1n;
    let p_curr = cf[0];
    let q_prev = 0n;
    let q_curr = 1n;
    for (let i = 1;i < cf.length; i++) {
      const a = cf[i];
      const p_next = a * p_curr + p_prev;
      const q_next = a * q_curr + q_prev;
      p_prev = p_curr;
      p_curr = p_next;
      q_prev = q_curr;
      q_curr = q_next;
    }
    return new Rational(p_curr, q_curr);
  }
  #continuedFractionResult(maxTerms, long) {
    if (this.#denominator === 1n) {
      const completeCoefficients = long ? [this.#numerator - 1n, 1n] : [this.#numerator];
      return {
        coefficients: completeCoefficients.slice(0, maxTerms),
        complete: completeCoefficients.length <= maxTerms
      };
    }
    const coefficients = [];
    let numerator = this.#numerator;
    let denominator = this.#denominator;
    const negative = numerator < 0n;
    if (negative)
      numerator = -numerator;
    let integerPart = numerator / denominator;
    if (negative) {
      integerPart = -integerPart;
      if (numerator % denominator !== 0n) {
        integerPart -= 1n;
        numerator = denominator - numerator % denominator;
      } else {
        numerator %= denominator;
      }
    } else {
      numerator %= denominator;
    }
    coefficients.push(integerPart);
    while (numerator !== 0n && coefficients.length < maxTerms) {
      coefficients.push(denominator / numerator);
      const remainder = denominator % numerator;
      denominator = numerator;
      numerator = remainder;
    }
    if (numerator !== 0n) {
      return { coefficients, complete: false };
    }
    if (coefficients.length > 1 && coefficients[coefficients.length - 1] === 1n) {
      coefficients[coefficients.length - 2] += 1n;
      coefficients.pop();
    }
    if (!long) {
      return { coefficients, complete: true };
    }
    const longCoefficients = coefficients.slice();
    longCoefficients[longCoefficients.length - 1] -= 1n;
    longCoefficients.push(1n);
    return {
      coefficients: longCoefficients.slice(0, maxTerms),
      complete: longCoefficients.length <= maxTerms
    };
  }
  toContinuedFraction(options) {
    const { maxTerms, long } = continuedFractionOptions(options, Rational.DEFAULT_CF_LIMIT);
    if (!Number.isSafeInteger(maxTerms) || maxTerms < 1) {
      throw new RangeError("Continued-fraction term limit must be a positive safe integer");
    }
    return this.#continuedFractionResult(maxTerms, long).coefficients;
  }
  toContinuedFractionString(options) {
    const { maxTerms, long } = continuedFractionOptions(options, Rational.DEFAULT_CF_LIMIT);
    if (!Number.isSafeInteger(maxTerms) || maxTerms < 1) {
      throw new RangeError("Continued-fraction term limit must be a positive safe integer");
    }
    const { coefficients: cf, complete } = this.#continuedFractionResult(maxTerms, long);
    if (cf.length === 1) {
      return complete ? `${cf[0]}.~0` : `${cf[0]}.~...`;
    }
    const intPart = cf[0];
    const cfTerms = cf.slice(1);
    const suffix = complete ? "" : "~...";
    return `${intPart}.~${cfTerms.join("~")}${suffix}`;
  }
  static fromContinuedFractionString(cfString) {
    return Rational.fromContinuedFraction(Rational.#continuedFractionString(cfString));
  }
  convergents(options) {
    const { maxCount, long, intermediates } = convergentOptions(options, Rational.DEFAULT_CF_LIMIT);
    if (!Number.isSafeInteger(maxCount) || maxCount < 1) {
      throw new RangeError("Convergent count must be a positive safe integer");
    }
    const cf = this.toContinuedFraction({ maxTerms: maxCount, long });
    return Rational.#convergentsForCoefficients(cf, maxCount, intermediates);
  }
  getConvergent(n) {
    if (!Number.isSafeInteger(n) || n < 0) {
      throw new RangeError("Convergent index must be a nonnegative safe integer");
    }
    const requestedCount = Math.min(n + 1, Number.MAX_SAFE_INTEGER);
    const convergents = this.convergents(requestedCount);
    if (n >= convergents.length) {
      throw new Error(`Convergent index ${n} out of range [0, ${convergents.length - 1}]`);
    }
    return convergents[n];
  }
  static convergentsFromCF(cfInput, maxCount = Rational.DEFAULT_CF_LIMIT) {
    if (!Number.isSafeInteger(maxCount) || maxCount < 1) {
      throw new RangeError("Convergent count must be a positive safe integer");
    }
    const cf = typeof cfInput === "string" ? Rational.#continuedFractionString(cfInput) : Rational.#continuedFractionArray(cfInput);
    return Rational.#convergentsForCoefficients(cf, maxCount);
  }
  approximationError(target) {
    if (!(target instanceof Rational)) {
      throw new Error("Target must be a Rational");
    }
    return this.subtract(target).abs();
  }
  bestApproximation(maxDenominator) {
    if (typeof maxDenominator !== "bigint" || maxDenominator < 1n) {
      throw new Error("Maximum denominator must be a positive bigint");
    }
    if (this.#denominator <= maxDenominator) {
      return new Rational(this.#numerator, this.#denominator);
    }
    const negative = this.#numerator < 0n;
    let numerator = negative ? -this.#numerator : this.#numerator;
    let denominator = this.#denominator;
    let previousNumerator = 0n;
    let previousDenominator = 1n;
    let currentNumerator = 1n;
    let currentDenominator = 0n;
    while (denominator !== 0n) {
      const coefficient = numerator / denominator;
      const nextDenominator = previousDenominator + coefficient * currentDenominator;
      if (nextDenominator > maxDenominator) {
        break;
      }
      [previousNumerator, currentNumerator] = [
        currentNumerator,
        previousNumerator + coefficient * currentNumerator
      ];
      [previousDenominator, currentDenominator] = [
        currentDenominator,
        nextDenominator
      ];
      [numerator, denominator] = [
        denominator,
        numerator - coefficient * denominator
      ];
    }
    const multiplier = (maxDenominator - previousDenominator) / currentDenominator;
    const semiconvergentNumerator = previousNumerator + multiplier * currentNumerator;
    const semiconvergentDenominator = previousDenominator + multiplier * currentDenominator;
    const targetNumerator = negative ? -this.#numerator : this.#numerator;
    const semiconvergentError = targetNumerator * semiconvergentDenominator - semiconvergentNumerator * this.#denominator;
    const convergentError = targetNumerator * currentDenominator - currentNumerator * this.#denominator;
    const absoluteSemiconvergentError = semiconvergentError < 0n ? -semiconvergentError : semiconvergentError;
    const absoluteConvergentError = convergentError < 0n ? -convergentError : convergentError;
    const useConvergent = absoluteConvergentError * semiconvergentDenominator <= absoluteSemiconvergentError * currentDenominator;
    const resultNumerator = useConvergent ? currentNumerator : semiconvergentNumerator;
    const resultDenominator = useConvergent ? currentDenominator : semiconvergentDenominator;
    return new Rational(negative ? -resultNumerator : resultNumerator, resultDenominator);
  }
  bestConvergent(maxDenominator) {
    if (typeof maxDenominator !== "bigint" || maxDenominator < 1n) {
      throw new Error("Maximum denominator must be a positive bigint");
    }
    const negative = this.#numerator < 0n;
    let numerator = negative ? -this.#numerator : this.#numerator;
    let denominator = this.#denominator;
    let previousNumerator = 0n;
    let previousDenominator = 1n;
    let currentNumerator = 1n;
    let currentDenominator = 0n;
    while (denominator !== 0n) {
      const coefficient = numerator / denominator;
      const nextNumerator = previousNumerator + coefficient * currentNumerator;
      const nextDenominator = previousDenominator + coefficient * currentDenominator;
      if (nextDenominator > maxDenominator) {
        break;
      }
      [previousNumerator, currentNumerator] = [
        currentNumerator,
        nextNumerator
      ];
      [previousDenominator, currentDenominator] = [
        currentDenominator,
        nextDenominator
      ];
      [numerator, denominator] = [
        denominator,
        numerator - coefficient * denominator
      ];
    }
    return new Rational(negative ? -currentNumerator : currentNumerator, currentDenominator);
  }
  bitLength() {
    return Math.max(bitLength(this.numerator), bitLength(this.denominator));
  }
}

// ../../packages/core/src/rational-interval.js
function hasTerminatingDecimal(value) {
  let denominator = value.denominator;
  while (denominator % 2n === 0n)
    denominator /= 2n;
  while (denominator % 5n === 0n)
    denominator /= 5n;
  return denominator === 1n;
}
function exactTerminatingDecimal(value) {
  if (!hasTerminatingDecimal(value))
    return null;
  const isNegative = value.numerator < 0n;
  const numerator = isNegative ? -value.numerator : value.numerator;
  let denominator = value.denominator;
  let twos = 0;
  let fives = 0;
  while (denominator % 2n === 0n) {
    denominator /= 2n;
    twos += 1;
  }
  while (denominator % 5n === 0n) {
    denominator /= 5n;
    fives += 1;
  }
  const decimalPlaces = Math.max(twos, fives);
  const scale = 10n ** BigInt(decimalPlaces);
  const scaled = numerator * (scale / value.denominator);
  const integerPart = scaled / scale;
  const sign = isNegative ? "-" : "";
  if (decimalPlaces === 0)
    return sign + integerPart.toString();
  const fractionalPart = (scaled % scale).toString().padStart(decimalPlaces, "0").replace(/0+$/, "");
  return fractionalPart.length === 0 ? sign + integerPart.toString() : `${sign}${integerPart}.${fractionalPart}`;
}
function exactOffsetString(value) {
  return exactTerminatingDecimal(value) ?? value.toString();
}
function gcd(a, b) {
  while (b !== 0n)
    [a, b] = [b, a % b];
  return a < 0n ? -a : a;
}
function lcm(a, b) {
  return a / gcd(a, b) * b;
}
function randomBigIntBelow(limit, random) {
  const draw = () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("Random source must return a finite number in [0, 1)");
    }
    return value;
  };
  if (limit <= 9007199254740992n) {
    return BigInt(Math.floor(draw() * Number(limit)));
  }
  const bitCount = limit.toString(2).length;
  const chunks = Math.ceil(bitCount / 53);
  const mask = (1n << BigInt(bitCount)) - 1n;
  const rejectedCandidates = new Set;
  while (true) {
    let candidate = 0n;
    for (let i = 0;i < chunks; i += 1) {
      candidate = candidate << 53n | BigInt(Math.floor(draw() * 9007199254740992));
    }
    candidate &= mask;
    if (candidate < limit)
      return candidate;
    if (rejectedCandidates.has(candidate)) {
      throw new RangeError("Random source repeatedly produced a rejected value; it must vary between calls");
    }
    rejectedCandidates.add(candidate);
  }
}

class RationalInterval {
  #start;
  #end;
  #low;
  #high;
  static zero = Object.freeze(new RationalInterval(Rational.zero, Rational.zero));
  static one = Object.freeze(new RationalInterval(Rational.one, Rational.one));
  static unitInterval = Object.freeze(new RationalInterval(Rational.zero, Rational.one));
  constructor(a, b) {
    const aRational = a instanceof Rational ? a : new Rational(a);
    const bRational = b instanceof Rational ? b : new Rational(b);
    this.#start = aRational;
    this.#end = bRational;
    if (aRational.lessThanOrEqual(bRational)) {
      this.#low = aRational;
      this.#high = bRational;
    } else {
      this.#low = bRational;
      this.#high = aRational;
    }
  }
  get start() {
    return this.#start;
  }
  get end() {
    return this.#end;
  }
  get isAscending() {
    return this.#start.lessThanOrEqual(this.#end);
  }
  get low() {
    return this.#low;
  }
  get high() {
    return this.#high;
  }
  add(other) {
    if (other?.isCertifiedApproximation === true) {
      return this.add(other.enclosure);
    }
    if (other.value !== undefined && typeof other.value === "bigint") {
      const otherAsRational = new Rational(other.value, 1n);
      const otherAsInterval = new RationalInterval(otherAsRational, otherAsRational);
      return this.add(otherAsInterval);
    } else if (other.numerator !== undefined && other.denominator !== undefined) {
      const otherAsInterval = new RationalInterval(other, other);
      return this.add(otherAsInterval);
    } else if (other.low && other.high) {
      const newLow = this.#low.add(other.low);
      const newHigh = this.#high.add(other.high);
      return new RationalInterval(newLow, newHigh);
    } else {
      throw new Error(`Cannot add ${other.constructor.name} to RationalInterval`);
    }
  }
  subtract(other) {
    if (other?.isCertifiedApproximation === true) {
      return this.subtract(other.enclosure);
    }
    if (other.value !== undefined && typeof other.value === "bigint") {
      const otherAsRational = new Rational(other.value, 1n);
      const otherAsInterval = new RationalInterval(otherAsRational, otherAsRational);
      return this.subtract(otherAsInterval);
    } else if (other.numerator !== undefined && other.denominator !== undefined) {
      const otherAsInterval = new RationalInterval(other, other);
      return this.subtract(otherAsInterval);
    } else if (other.low && other.high) {
      const newLow = this.#low.subtract(other.high);
      const newHigh = this.#high.subtract(other.low);
      return new RationalInterval(newLow, newHigh);
    } else {
      throw new Error(`Cannot subtract ${other.constructor.name} from RationalInterval`);
    }
  }
  multiply(other) {
    if (other?.isCertifiedApproximation === true) {
      return this.multiply(other.enclosure);
    }
    if (other.value !== undefined && typeof other.value === "bigint") {
      const otherAsRational = new Rational(other.value, 1n);
      const otherAsInterval = new RationalInterval(otherAsRational, otherAsRational);
      return this.multiply(otherAsInterval);
    } else if (other.numerator !== undefined && other.denominator !== undefined) {
      const otherAsInterval = new RationalInterval(other, other);
      return this.multiply(otherAsInterval);
    } else if (other.low && other.high) {
      const products = [
        this.#low.multiply(other.low),
        this.#low.multiply(other.high),
        this.#high.multiply(other.low),
        this.#high.multiply(other.high)
      ];
      let min = products[0];
      let max = products[0];
      for (let i = 1;i < products.length; i++) {
        if (products[i].lessThan(min))
          min = products[i];
        if (products[i].greaterThan(max))
          max = products[i];
      }
      return new RationalInterval(min, max);
    } else {
      throw new Error(`Cannot multiply RationalInterval by ${other.constructor.name}`);
    }
  }
  divide(other) {
    if (other?.isCertifiedApproximation === true) {
      return this.divide(other.enclosure);
    }
    if (other.value !== undefined && typeof other.value === "bigint") {
      if (other.value === 0n) {
        throw new Error("Division by zero");
      }
      const otherAsRational = new Rational(other.value, 1n);
      const otherAsInterval = new RationalInterval(otherAsRational, otherAsRational);
      return this.divide(otherAsInterval);
    } else if (other.numerator !== undefined && other.denominator !== undefined) {
      if (other.numerator === 0n) {
        throw new Error("Division by zero");
      }
      const otherAsInterval = new RationalInterval(other, other);
      return this.divide(otherAsInterval);
    } else if (other.low && other.high) {
      const zero = Rational.zero;
      if (other.low.equals(zero) && other.high.equals(zero)) {
        throw new Error("Division by zero");
      }
      if (other.containsZero()) {
        throw new Error("Cannot divide by an interval containing zero");
      }
      const quotients = [
        this.#low.divide(other.low),
        this.#low.divide(other.high),
        this.#high.divide(other.low),
        this.#high.divide(other.high)
      ];
      let min = quotients[0];
      let max = quotients[0];
      for (let i = 1;i < quotients.length; i++) {
        if (quotients[i].lessThan(min))
          min = quotients[i];
        if (quotients[i].greaterThan(max))
          max = quotients[i];
      }
      return new RationalInterval(min, max);
    } else {
      throw new Error(`Cannot divide RationalInterval by ${other.constructor.name}`);
    }
  }
  possibleRelationsTo(other) {
    if (other?.isCertifiedApproximation === true)
      other = other.enclosure;
    if (other?.value !== undefined && typeof other.value === "bigint") {
      other = new Rational(other.value, 1n);
    }
    if (other?.numerator !== undefined && other?.denominator !== undefined) {
      other = new RationalInterval(other, other);
    }
    if (!other?.low || !other?.high) {
      throw new TypeError("Possible relations require a Core numeric value");
    }
    let mask = 0;
    if (this.#low.lessThan(other.high))
      mask |= 1;
    if (this.#low.lessThanOrEqual(other.high) && other.low.lessThanOrEqual(this.#high))
      mask |= 2;
    if (this.#high.greaterThan(other.low))
      mask |= 4;
    return mask;
  }
  reciprocate() {
    if (this.containsZero()) {
      throw new Error("Cannot reciprocate an interval containing zero");
    }
    return new RationalInterval(this.#high.reciprocal(), this.#low.reciprocal());
  }
  negate() {
    return new RationalInterval(this.#high.negate(), this.#low.negate());
  }
  pow(exponent) {
    const n = toExactBigInt(exponent, "Exponent");
    const zero = Rational.zero;
    if (n === 0n) {
      if (this.#low.equals(zero) && this.#high.equals(zero)) {
        throw new Error("Zero cannot be raised to the power of zero");
      }
      if (this.containsZero()) {
        throw new Error("Cannot raise an interval containing zero to the power of zero");
      }
      return new RationalInterval(Rational.one, Rational.one);
    }
    if (n < 0n) {
      if (this.containsZero()) {
        throw new Error("Cannot raise an interval containing zero to a negative power");
      }
      const positivePower = this.pow(-n);
      const reciprocal = new RationalInterval(positivePower.high.reciprocal(), positivePower.low.reciprocal());
      return reciprocal;
    }
    if (n === 1n) {
      return new RationalInterval(this.#low, this.#high);
    }
    if (n % 2n === 0n) {
      let minVal;
      let maxVal;
      if (this.#low.lessThanOrEqual(zero) && this.#high.greaterThanOrEqual(zero)) {
        minVal = new Rational(0);
        const lowPow = this.#low.abs().pow(n);
        const highPow = this.#high.abs().pow(n);
        maxVal = lowPow.greaterThan(highPow) ? lowPow : highPow;
      } else if (this.#high.lessThan(zero)) {
        minVal = this.#high.pow(n);
        maxVal = this.#low.pow(n);
      } else {
        minVal = this.#low.pow(n);
        maxVal = this.#high.pow(n);
      }
      return new RationalInterval(minVal, maxVal);
    } else {
      return new RationalInterval(this.#low.pow(n), this.#high.pow(n));
    }
  }
  mpow(exponent) {
    const n = toExactBigInt(exponent, "Exponent");
    const zero = Rational.zero;
    if (n === 0n) {
      throw new Error("Multiplicative exponentiation requires at least one factor");
    }
    if (n < 0n) {
      const recipInterval = this.reciprocate();
      return recipInterval.mpow(-n);
    }
    if (n === 1n) {
      return new RationalInterval(this.#low, this.#high);
    }
    if (n === 1n) {
      return new RationalInterval(this.#low, this.#high);
    }
    let result = new RationalInterval(this.#low, this.#high);
    for (let i = 1n;i < n; i++) {
      result = result.multiply(this);
    }
    return result;
  }
  overlaps(other) {
    return !(this.#high.lessThan(other.low) || other.high.lessThan(this.#low));
  }
  contains(other) {
    return this.#low.lessThanOrEqual(other.low) && this.#high.greaterThanOrEqual(other.high);
  }
  containsValue(value) {
    const r = value instanceof Rational ? value : new Rational(value);
    return this.#low.lessThanOrEqual(r) && this.#high.greaterThanOrEqual(r);
  }
  containsZero() {
    const zero = Rational.zero;
    return this.#low.lessThanOrEqual(zero) && this.#high.greaterThanOrEqual(zero);
  }
  equals(other) {
    return this.#low.equals(other.low) && this.#high.equals(other.high);
  }
  intersection(other) {
    if (!this.overlaps(other)) {
      return null;
    }
    const newLow = this.#low.greaterThan(other.low) ? this.#low : other.low;
    const newHigh = this.#high.lessThan(other.high) ? this.#high : other.high;
    return new RationalInterval(newLow, newHigh);
  }
  union(other) {
    const adjacentRight = this.#high.equals(other.low);
    const adjacentLeft = other.high.equals(this.#low);
    if (!this.overlaps(other) && !adjacentRight && !adjacentLeft) {
      return null;
    }
    const newLow = this.#low.lessThan(other.low) ? this.#low : other.low;
    const newHigh = this.#high.greaterThan(other.high) ? this.#high : other.high;
    return new RationalInterval(newLow, newHigh);
  }
  toString() {
    return `${this.#start.toString()}:${this.#end.toString()}`;
  }
  toMixedString() {
    return `${this.#start.toMixedString()}:${this.#end.toMixedString()}`;
  }
  static point(value) {
    let r;
    if (value instanceof Rational) {
      r = value;
    } else if (value && typeof value === "object" && typeof value.value === "bigint") {
      r = new Rational(value.value);
    } else if (typeof value === "number") {
      r = new Rational(String(value));
    } else if (typeof value === "string" || typeof value === "bigint") {
      r = new Rational(value);
    } else {
      throw new Error("Point value must be an Integer or Rational input");
    }
    return new RationalInterval(r, r);
  }
  static fromString(str) {
    const parts = str.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid interval format. Use 'a:b'");
    }
    return new RationalInterval(parts[0], parts[1]);
  }
  toRepeatingDecimal(options = true) {
    const startDecimal = this.#start.toRepeatingDecimalWithPeriod(options).decimal;
    const endDecimal = this.#end.toRepeatingDecimalWithPeriod(options).decimal;
    if (startDecimal === null || endDecimal === null)
      return null;
    return `${startDecimal}:${endDecimal}`;
  }
  compactedDecimalInterval() {
    const startStr = this.#start.toDecimal();
    const endStr = this.#end.toDecimal();
    let commonPrefix = "";
    const minLength = Math.min(startStr.length, endStr.length);
    for (let i = 0;i < minLength; i++) {
      if (startStr[i] === endStr[i]) {
        commonPrefix += startStr[i];
      } else {
        break;
      }
    }
    if (commonPrefix.length <= 1 || commonPrefix.startsWith("-") && commonPrefix.length <= 2) {
      return `${startStr}:${endStr}`;
    }
    const startSuffix = startStr.substring(commonPrefix.length);
    const endSuffix = endStr.substring(commonPrefix.length);
    if (!startSuffix || !endSuffix || startSuffix.length !== endSuffix.length) {
      return `${startStr}:${endStr}`;
    }
    if (!/^\d+$/.test(startSuffix) || !/^\d+$/.test(endSuffix)) {
      return `${startStr}:${endStr}`;
    }
    return `${commonPrefix}[${startSuffix}:${endSuffix}]`;
  }
  relativeMidDecimalInterval() {
    const midpoint = this.#low.add(this.#high).divide(new Rational(2));
    const offsetEnd = this.#end.subtract(midpoint);
    const offsetStart = this.#start.subtract(midpoint);
    const midpointStr = midpoint.toDecimal();
    const decimalPlaces = midpointStr.includes(".") ? midpointStr.split(".")[1].length : 0;
    const scaleFactor = decimalPlaces === 0 ? Rational.one : new Rational(10).pow(decimalPlaces);
    const scaledOffsetStart = offsetStart.multiply(scaleFactor);
    const scaledOffsetEnd = offsetEnd.multiply(scaleFactor);
    if (offsetStart.equals(offsetEnd.negate())) {
      const offsetStr = scaledOffsetEnd.abs().toDecimal();
      return `${midpointStr}[+-${offsetStr}]`;
    }
    const offStartStr = scaledOffsetStart.toDecimal();
    const offEndStr = scaledOffsetEnd.toDecimal();
    const startSign = scaledOffsetStart.compareTo(Rational.zero) > 0 ? "+" : "";
    const endSign = scaledOffsetEnd.compareTo(Rational.zero) > 0 ? "+" : "";
    return `${midpointStr}[${startSign}${offStartStr}:${endSign}${offEndStr}]`;
  }
  relativeDecimalInterval() {
    if (this.#low.equals(this.#high)) {
      return this.toRepeatingDecimal();
    }
    const shortestDecimal = this.#findShortestPreciseDecimal();
    const offsetStart = this.#start.subtract(shortestDecimal);
    const offsetEnd = this.#end.subtract(shortestDecimal);
    const decimalStr = exactTerminatingDecimal(shortestDecimal);
    if (decimalStr === null) {
      throw new Error("Shortest decimal search returned a non-terminating value");
    }
    const decimalPlaces = decimalStr.includes(".") ? decimalStr.split(".")[1].length : 0;
    let scaledOffsetStart, scaledOffsetEnd;
    if (decimalPlaces === 0) {
      scaledOffsetStart = offsetStart;
      scaledOffsetEnd = offsetEnd;
    } else {
      const scaleFactor = new Rational(10).pow(decimalPlaces);
      scaledOffsetStart = offsetStart.multiply(scaleFactor);
      scaledOffsetEnd = offsetEnd.multiply(scaleFactor);
    }
    if (offsetStart.equals(offsetEnd.negate())) {
      return `${decimalStr}[+-${exactOffsetString(scaledOffsetEnd.abs())}]`;
    } else {
      const off1 = { v: scaledOffsetStart };
      const off2 = { v: scaledOffsetEnd };
      const sorted = [off1, off2].sort((a, b) => b.v.compareTo(a.v));
      const s1 = "+" + exactOffsetString(sorted[0].v.abs());
      const s2 = "-" + exactOffsetString(sorted[1].v.abs());
      return `${decimalStr}[${s1}:${s2}]`;
    }
  }
  #findShortestPreciseDecimal() {
    const midpoint = this.#low.add(this.#high).divide(new Rational(2));
    let scale = Rational.one;
    while (true) {
      const lowScaled = this.#low.multiply(scale);
      const highScaled = this.#high.multiply(scale);
      const minInt = this.#ceilRational(lowScaled);
      const maxInt = this.#floorRational(highScaled);
      if (minInt.compareTo(maxInt) <= 0) {
        const scaledMidpoint = midpoint.multiply(scale);
        let bestInt;
        if (scaledMidpoint.lessThanOrEqual(minInt)) {
          bestInt = minInt;
        } else if (scaledMidpoint.greaterThanOrEqual(maxInt)) {
          bestInt = maxInt;
        } else {
          const lower = this.#floorRational(scaledMidpoint);
          const upper = this.#ceilRational(scaledMidpoint);
          const lowerDistance = scaledMidpoint.subtract(lower).abs();
          const upperDistance = upper.subtract(scaledMidpoint).abs();
          bestInt = lowerDistance.lessThanOrEqual(upperDistance) ? lower : upper;
        }
        return bestInt.divide(scale);
      }
      scale = scale.multiply(new Rational(10));
    }
  }
  #ceilRational(rational) {
    if (rational.denominator === 1n) {
      return rational;
    }
    const quotient = rational.numerator / rational.denominator;
    if (rational.numerator >= 0n) {
      return new Rational(quotient + 1n, 1n);
    } else {
      return new Rational(quotient, 1n);
    }
  }
  #floorRational(rational) {
    if (rational.denominator === 1n) {
      return rational;
    }
    const quotient = rational.numerator / rational.denominator;
    if (rational.numerator >= 0n) {
      return new Rational(quotient, 1n);
    } else {
      return new Rational(quotient - 1n, 1n);
    }
  }
  mediant() {
    return new Rational(this.#low.numerator + this.#high.numerator, this.#low.denominator + this.#high.denominator);
  }
  midpoint() {
    return this.#low.add(this.#high).divide(new Rational(2));
  }
  shortestDecimal(base = 10) {
    const baseBigInt = toExactBigInt(base, "Base");
    if (baseBigInt <= 1n) {
      throw new Error("Base must be greater than 1");
    }
    if (this.#low.equals(this.#high)) {
      const value = this.#low;
      let remainingDenominator = value.denominator;
      while (remainingDenominator !== 1n) {
        const commonFactor = this.#gcd(remainingDenominator, baseBigInt);
        if (commonFactor === 1n)
          return null;
        remainingDenominator /= commonFactor;
      }
      return new Rational(value.numerator, value.denominator);
    }
    let denominator = 1n;
    while (true) {
      const minNumerator = this.#ceilRational(this.#low.multiply(new Rational(denominator)));
      const maxNumerator = this.#floorRational(this.#high.multiply(new Rational(denominator)));
      if (minNumerator.lessThanOrEqual(maxNumerator)) {
        return new Rational(minNumerator.numerator, denominator);
      }
      denominator *= baseBigInt;
    }
  }
  denominatorInterval(denominator, onEmpty = "error") {
    const gridDenominator = denominator === undefined ? lcm(this.#low.denominator, this.#high.denominator) : toExactBigInt(denominator, "Grid denominator");
    if (gridDenominator <= 0n) {
      throw new RangeError("Grid denominator must be positive");
    }
    if (!new Set(["mid", "null", "error"]).has(onEmpty)) {
      throw new TypeError('onEmpty must be "mid", "null", or "error"');
    }
    const first = this.#ceilRational(this.#low.multiply(new Rational(gridDenominator))).numerator;
    const last = this.#floorRational(this.#high.multiply(new Rational(gridDenominator))).numerator;
    if (first <= last) {
      return new RationalInterval(new Rational(first, gridDenominator), new Rational(last, gridDenominator));
    }
    if (onEmpty === "null")
      return null;
    if (onEmpty === "mid")
      return RationalInterval.point(this.midpoint());
    throw new RangeError(`No rational with grid denominator ${gridDenominator} lies in this interval`);
  }
  randomRational(denominator, onEmpty = "error", random = Math.random) {
    if (typeof random !== "function") {
      throw new TypeError("Random source must be a function");
    }
    const gridDenominator = denominator === undefined ? lcm(this.#low.denominator, this.#high.denominator) : toExactBigInt(denominator, "Grid denominator");
    const grid = this.denominatorInterval(gridDenominator, onEmpty);
    if (grid === null)
      return null;
    const first = this.#ceilRational(this.#low.multiply(new Rational(gridDenominator))).numerator;
    const last = this.#floorRational(this.#high.multiply(new Rational(gridDenominator))).numerator;
    if (first > last)
      return grid.start;
    const numerator = first + randomBigIntBelow(last - first + 1n, random);
    return new Rational(numerator, gridDenominator);
  }
  #gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
  E(exponent) {
    const exp = toExactBigInt(exponent, "Exponent");
    let powerOf10;
    if (exp >= 0n) {
      powerOf10 = new Rational(10n ** exp, 1n);
    } else {
      powerOf10 = new Rational(1n, 10n ** -exp);
    }
    const newLow = this.#low.multiply(powerOf10);
    const newHigh = this.#high.multiply(powerOf10);
    return new RationalInterval(newLow, newHigh);
  }
  bitLength() {
    const lowBits = this.#low.bitLength();
    const highBits = this.#high.bitLength();
    return Math.max(lowBits, highBits);
  }
  toJSON() {
    return { $ratmath: "RationalInterval", start: this.#start, end: this.#end };
  }
}

// ../../packages/core/src/rational-interval-set.js
function asRational(value, name) {
  if (value === null)
    return null;
  if (value === undefined) {
    throw new TypeError(`${name} endpoint is required; use null for infinity`);
  }
  return value instanceof Rational ? value : new Rational(value);
}
function compareFinite(left, right) {
  if (left.lessThan(right))
    return -1;
  if (left.greaterThan(right))
    return 1;
  return 0;
}
function compareLow(left, right) {
  if (left === null)
    return right === null ? 0 : -1;
  if (right === null)
    return 1;
  return compareFinite(left, right);
}
function compareHigh(left, right) {
  if (left === null)
    return right === null ? 0 : 1;
  if (right === null)
    return -1;
  return compareFinite(left, right);
}
function freezeComponent(component) {
  return Object.freeze(component);
}
function normalizeComponent(input) {
  if (input instanceof RationalInterval) {
    return freezeComponent({
      low: input.low,
      high: input.high,
      lowClosed: true,
      highClosed: true
    });
  }
  if (!input || typeof input !== "object") {
    throw new TypeError("Interval-set components must be interval objects");
  }
  const low = asRational(input.low, "Low");
  const high = asRational(input.high, "High");
  const lowClosed = input.lowClosed ?? low !== null;
  const highClosed = input.highClosed ?? high !== null;
  if (typeof lowClosed !== "boolean" || typeof highClosed !== "boolean") {
    throw new TypeError("Endpoint closure flags must be booleans");
  }
  if (low === null && lowClosed) {
    throw new RangeError("-Infinity cannot be a closed endpoint");
  }
  if (high === null && highClosed) {
    throw new RangeError("+Infinity cannot be a closed endpoint");
  }
  if (low !== null && high !== null) {
    const order = compareFinite(low, high);
    if (order > 0)
      throw new RangeError("Interval-set low endpoint exceeds high endpoint");
    if (order === 0 && !(lowClosed && highClosed))
      return null;
  }
  return freezeComponent({ low, high, lowClosed, highClosed });
}
function componentsJoin(left, right) {
  if (right.low === null)
    return true;
  if (left.high === null)
    return true;
  const order = compareFinite(left.high, right.low);
  return order > 0 || order === 0 && (left.highClosed || right.lowClosed);
}
function mergeComponents(left, right) {
  let high;
  let highClosed;
  const highOrder = compareHigh(left.high, right.high);
  if (highOrder > 0) {
    high = left.high;
    highClosed = left.highClosed;
  } else if (highOrder < 0) {
    high = right.high;
    highClosed = right.highClosed;
  } else {
    high = left.high;
    highClosed = left.high === null ? false : left.highClosed || right.highClosed;
  }
  const sameLow = compareLow(left.low, right.low) === 0;
  return freezeComponent({
    low: left.low,
    high,
    lowClosed: left.low === null ? false : left.lowClosed || sameLow && right.lowClosed,
    highClosed
  });
}
function normalizeComponents(inputs) {
  const sorted = inputs.map(normalizeComponent).filter((component) => component !== null).sort((left, right) => {
    const byLow = compareLow(left.low, right.low);
    if (byLow !== 0)
      return byLow;
    if (left.lowClosed !== right.lowClosed)
      return left.lowClosed ? -1 : 1;
    return compareHigh(right.high, left.high);
  });
  const result = [];
  for (const component of sorted) {
    const previous = result.at(-1);
    if (!previous || !componentsJoin(previous, component)) {
      result.push(component);
    } else {
      result[result.length - 1] = mergeComponents(previous, component);
    }
  }
  return Object.freeze(result);
}
function componentContainsValue(component, value) {
  const aboveLow = component.low === null || component.low.lessThan(value) || component.low.equals(value) && component.lowClosed;
  const belowHigh = component.high === null || component.high.greaterThan(value) || component.high.equals(value) && component.highClosed;
  return aboveLow && belowHigh;
}
function componentContainsComponent(outer, inner) {
  let lowerContained;
  if (outer.low === null) {
    lowerContained = true;
  } else if (inner.low === null) {
    lowerContained = false;
  } else {
    const order = compareFinite(outer.low, inner.low);
    lowerContained = order < 0 || order === 0 && (outer.lowClosed || !inner.lowClosed);
  }
  let upperContained;
  if (outer.high === null) {
    upperContained = true;
  } else if (inner.high === null) {
    upperContained = false;
  } else {
    const order = compareFinite(outer.high, inner.high);
    upperContained = order > 0 || order === 0 && (outer.highClosed || !inner.highClosed);
  }
  return lowerContained && upperContained;
}
function intersectionComponent(left, right) {
  let low;
  let lowClosed;
  const lowOrder = compareLow(left.low, right.low);
  if (lowOrder > 0) {
    low = left.low;
    lowClosed = left.lowClosed;
  } else if (lowOrder < 0) {
    low = right.low;
    lowClosed = right.lowClosed;
  } else {
    low = left.low;
    lowClosed = low === null ? false : left.lowClosed && right.lowClosed;
  }
  let high;
  let highClosed;
  const highOrder = compareHigh(left.high, right.high);
  if (highOrder < 0) {
    high = left.high;
    highClosed = left.highClosed;
  } else if (highOrder > 0) {
    high = right.high;
    highClosed = right.highClosed;
  } else {
    high = left.high;
    highClosed = high === null ? false : left.highClosed && right.highClosed;
  }
  if (low !== null && high !== null) {
    const order = compareFinite(low, high);
    if (order > 0 || order === 0 && !(lowClosed && highClosed))
      return null;
  }
  return freezeComponent({ low, high, lowClosed, highClosed });
}
function asIntervalSet(value) {
  if (value instanceof RationalIntervalSet)
    return value;
  return new RationalIntervalSet(value);
}
function formatEndpoint(value, negative) {
  if (value === null)
    return negative ? "-inf" : "inf";
  return value.toString();
}

class RationalIntervalSet {
  #components;
  static empty = Object.freeze(new RationalIntervalSet);
  static allReals = Object.freeze(new RationalIntervalSet({
    low: null,
    high: null,
    lowClosed: false,
    highClosed: false
  }));
  constructor(components = []) {
    if (components instanceof RationalIntervalSet) {
      this.#components = components.#components;
      return;
    }
    const inputs = Array.isArray(components) ? components : [components];
    this.#components = normalizeComponents(inputs);
  }
  get components() {
    return this.#components;
  }
  get isEmpty() {
    return this.#components.length === 0;
  }
  get isConnected() {
    return this.#components.length <= 1;
  }
  get isBounded() {
    return this.isEmpty || this.#components[0].low !== null && this.#components.at(-1).high !== null;
  }
  get componentCount() {
    return this.#components.length;
  }
  containsValue(value) {
    const rational = value instanceof Rational ? value : new Rational(value);
    return this.#components.some((component) => componentContainsValue(component, rational));
  }
  contains(other) {
    const set = asIntervalSet(other);
    return set.#components.every((inner) => this.#components.some((outer) => componentContainsComponent(outer, inner)));
  }
  equals(other) {
    const set = asIntervalSet(other);
    if (this.componentCount !== set.componentCount)
      return false;
    return this.#components.every((left, index) => {
      const right = set.#components[index];
      return compareLow(left.low, right.low) === 0 && compareHigh(left.high, right.high) === 0 && left.lowClosed === right.lowClosed && left.highClosed === right.highClosed;
    });
  }
  union(other) {
    const set = asIntervalSet(other);
    return new RationalIntervalSet([...this.#components, ...set.#components]);
  }
  intersection(other) {
    const set = asIntervalSet(other);
    const intersections = [];
    let leftIndex = 0;
    let rightIndex = 0;
    while (leftIndex < this.componentCount && rightIndex < set.componentCount) {
      const left = this.#components[leftIndex];
      const right = set.#components[rightIndex];
      const component = intersectionComponent(left, right);
      if (component)
        intersections.push(component);
      const endOrder = compareHigh(left.high, right.high);
      if (endOrder <= 0)
        leftIndex += 1;
      if (endOrder >= 0)
        rightIndex += 1;
    }
    return new RationalIntervalSet(intersections);
  }
  hull() {
    if (this.isEmpty)
      return RationalIntervalSet.empty;
    const first = this.#components[0];
    const last = this.#components.at(-1);
    return new RationalIntervalSet({
      low: first.low,
      high: last.high,
      lowClosed: first.lowClosed,
      highClosed: last.highClosed
    });
  }
  toRationalInterval() {
    if (this.componentCount !== 1)
      return null;
    const component = this.#components[0];
    if (component.low === null || component.high === null || !component.lowClosed || !component.highClosed)
      return null;
    return new RationalInterval(component.low, component.high);
  }
  toString() {
    if (this.isEmpty)
      return "empty";
    return this.#components.map((component) => {
      const left = component.lowClosed ? "[" : "(";
      const right = component.highClosed ? "]" : ")";
      return `${left}${formatEndpoint(component.low, true)},${formatEndpoint(component.high, false)}${right}`;
    }).join(" U ");
  }
  toJSON() {
    return {
      $ratmath: "RationalIntervalSet",
      version: 1,
      components: this.#components.map((component) => ({ ...component }))
    };
  }
  static point(value) {
    const rational = value instanceof Rational ? value : new Rational(value);
    return new RationalIntervalSet({
      low: rational,
      high: rational,
      lowClosed: true,
      highClosed: true
    });
  }
  static fromInterval(interval) {
    if (!(interval instanceof RationalInterval)) {
      throw new TypeError("Expected a RationalInterval");
    }
    return new RationalIntervalSet(interval);
  }
}

// ../../packages/core/src/range-arithmetic.js
var ZERO = Rational.zero;
var ONE = Rational.one;
var RESULT_SCHEMA = "ratmath.range-operation-result@1";
var CHECKER_ID = "ratmath.core.range-arithmetic@1";
function isScalarInput(value) {
  return value instanceof Rational || value?.constructor?.name === "Integer" || typeof value === "number" || typeof value === "bigint" || typeof value === "string";
}
function asRationalIntervalSet(value) {
  if (value instanceof RationalIntervalSet)
    return value;
  if (value instanceof RationalInterval)
    return RationalIntervalSet.fromInterval(value);
  if (isScalarInput(value)) {
    return RationalIntervalSet.point(value?.constructor?.name === "Integer" ? value.value : value);
  }
  return new RationalIntervalSet(value);
}
function exactInteger(value, label = "Exponent") {
  if (typeof value === "bigint")
    return value;
  if (typeof value === "number" && Number.isSafeInteger(value))
    return BigInt(value);
  if (typeof value === "string") {
    const rational = new Rational(value);
    if (rational.denominator === 1n)
      return rational.numerator;
  }
  if (value?.constructor?.name === "Integer")
    return value.value;
  if (value instanceof Rational && value.denominator === 1n)
    return value.numerator;
  throw new TypeError(`${label} must be an exact integer`);
}
function negateComponent(component) {
  return {
    low: component.high === null ? null : component.high.negate(),
    high: component.low === null ? null : component.low.negate(),
    lowClosed: component.high === null ? false : component.highClosed,
    highClosed: component.low === null ? false : component.lowClosed
  };
}
function addComponents(left, right) {
  const low = left.low === null || right.low === null ? null : left.low.add(right.low);
  const high = left.high === null || right.high === null ? null : left.high.add(right.high);
  return {
    low,
    high,
    lowClosed: low === null ? false : left.lowClosed && right.lowClosed,
    highClosed: high === null ? false : left.highClosed && right.highClosed
  };
}
function containsZeroComponent(component) {
  const aboveLow = component.low === null || component.low.lessThan(ZERO) || component.low.equals(ZERO) && component.lowClosed;
  const belowHigh = component.high === null || component.high.greaterThan(ZERO) || component.high.equals(ZERO) && component.highClosed;
  return aboveLow && belowHigh;
}
function hasPositiveValue(component) {
  return component.high === null || component.high.greaterThan(ZERO);
}
function nonnegativeProductComponent(left, right) {
  const low = left.low.multiply(right.low);
  const lowClosed = low.equals(ZERO) ? containsZeroComponent(left) || containsZeroComponent(right) : left.lowClosed && right.lowClosed;
  const unbounded = left.high === null && hasPositiveValue(right) || right.high === null && hasPositiveValue(left);
  if (unbounded) {
    return { low, high: null, lowClosed, highClosed: false };
  }
  if (left.high === null || right.high === null) {
    return { low: ZERO, high: ZERO, lowClosed: true, highClosed: true };
  }
  const high = left.high.multiply(right.high);
  return {
    low,
    high,
    lowClosed,
    highClosed: high.equals(ZERO) ? true : left.highClosed && right.highClosed
  };
}
function nonpositiveToNonnegative(component) {
  return negateComponent(component);
}
function splitBySign(set, includeZero) {
  const negative = set.intersection({
    low: null,
    high: ZERO,
    lowClosed: false,
    highClosed: includeZero
  });
  const positive = set.intersection({
    low: ZERO,
    high: null,
    lowClosed: includeZero,
    highClosed: false
  });
  return { negative, positive };
}
function withoutZero(set) {
  const { negative, positive } = splitBySign(set, false);
  return negative.union(positive);
}
function multiplySets(left, right) {
  const leftSigns = splitBySign(left, true);
  const rightSigns = splitBySign(right, true);
  const components = [];
  const appendPositiveProducts = (leftSet, rightSet, negate = false) => {
    for (const a of leftSet.components) {
      for (const b of rightSet.components) {
        const product = nonnegativeProductComponent(a, b);
        components.push(negate ? negateComponent(product) : product);
      }
    }
  };
  const leftNegativeMagnitude = new RationalIntervalSet(leftSigns.negative.components.map(nonpositiveToNonnegative));
  const rightNegativeMagnitude = new RationalIntervalSet(rightSigns.negative.components.map(nonpositiveToNonnegative));
  appendPositiveProducts(leftSigns.positive, rightSigns.positive);
  appendPositiveProducts(leftNegativeMagnitude, rightNegativeMagnitude);
  appendPositiveProducts(leftNegativeMagnitude, rightSigns.positive, true);
  appendPositiveProducts(leftSigns.positive, rightNegativeMagnitude, true);
  return new RationalIntervalSet(components);
}
function reciprocalPositiveComponent(component) {
  const low = component.high === null ? ZERO : component.high.reciprocal();
  const high = component.low.equals(ZERO) ? null : component.low.reciprocal();
  return {
    low,
    high,
    lowClosed: component.high === null ? false : component.highClosed,
    highClosed: high === null ? false : component.lowClosed
  };
}
function reciprocalNegativeComponent(component) {
  const low = component.high.equals(ZERO) ? null : component.high.reciprocal();
  const high = component.low === null ? ZERO : component.low.reciprocal();
  return {
    low,
    high,
    lowClosed: low === null ? false : component.highClosed,
    highClosed: component.low === null ? false : component.lowClosed
  };
}
function reciprocalSet(set) {
  const { negative, positive } = splitBySign(set, false);
  return new RationalIntervalSet([
    ...negative.components.map(reciprocalNegativeComponent),
    ...positive.components.map(reciprocalPositiveComponent)
  ]);
}
function positiveIntegerPowerSet(set, exponent) {
  if (exponent <= 0n)
    throw new RangeError("Positive power helper requires exponent > 0");
  const odd = (exponent & 1n) === 1n;
  const source = odd ? set : absoluteSet(set);
  return new RationalIntervalSet(source.components.map((component) => ({
    low: component.low === null ? null : component.low.pow(exponent),
    high: component.high === null ? null : component.high.pow(exponent),
    lowClosed: component.low === null ? false : component.lowClosed,
    highClosed: component.high === null ? false : component.highClosed
  })));
}
function absoluteSet(set) {
  const { negative, positive } = splitBySign(set, true);
  return new RationalIntervalSet([
    ...negative.components.map(negateComponent),
    ...positive.components
  ]);
}
function unaryCoverage(set, definedInput) {
  if (set.isEmpty)
    return "allDefined";
  if (definedInput.equals(set))
    return "allDefined";
  if (definedInput.isEmpty)
    return "noDefinedInputs";
  return "partiallyDefined";
}
function freezeExclusion(exclusion) {
  return Object.freeze({ ...exclusion });
}
function domainRecord(coverage, options = {}) {
  return Object.freeze({
    coverage,
    ...options.definedInput ? { definedInput: options.definedInput } : {},
    exclusions: Object.freeze((options.exclusions || []).map(freezeExclusion))
  });
}
function operationResult(operation, operands, range, domain, parameters = {}) {
  return Object.freeze({
    schema: RESULT_SCHEMA,
    operation: `rix.core.range.${operation}@1`,
    operands: Object.freeze([...operands]),
    parameters: Object.freeze({ ...parameters }),
    range,
    domain,
    certified: true,
    evidenceLevel: "checkedEvidence",
    evidence: Object.freeze({
      schema: "rix.numerics.range-evidence-node@1",
      rule: `arith.${operation}`,
      checkedBy: CHECKER_ID
    })
  });
}
function totalDomain() {
  return domainRecord("allDefined");
}
function rangeNegate(value) {
  const input = asRationalIntervalSet(value);
  const range = new RationalIntervalSet(input.components.map(negateComponent));
  return operationResult("negate", [input], range, totalDomain());
}
function rangeAbsoluteValue(value) {
  const input = asRationalIntervalSet(value);
  return operationResult("absoluteValue", [input], absoluteSet(input), totalDomain());
}
function rangeAdd(leftValue, rightValue) {
  const left = asRationalIntervalSet(leftValue);
  const right = asRationalIntervalSet(rightValue);
  const components = [];
  for (const a of left.components) {
    for (const b of right.components)
      components.push(addComponents(a, b));
  }
  return operationResult("add", [left, right], new RationalIntervalSet(components), totalDomain());
}
function rangeSubtract(leftValue, rightValue) {
  const left = asRationalIntervalSet(leftValue);
  const right = asRationalIntervalSet(rightValue);
  const negated = new RationalIntervalSet(right.components.map(negateComponent));
  const components = [];
  for (const a of left.components) {
    for (const b of negated.components)
      components.push(addComponents(a, b));
  }
  return operationResult("subtract", [left, right], new RationalIntervalSet(components), totalDomain());
}
function rangeMultiply(leftValue, rightValue) {
  const left = asRationalIntervalSet(leftValue);
  const right = asRationalIntervalSet(rightValue);
  return operationResult("multiply", [left, right], multiplySets(left, right), totalDomain());
}
function rangeReciprocal(value) {
  const input = asRationalIntervalSet(value);
  const definedInput = withoutZero(input);
  const hasExcludedZero = input.containsValue(ZERO);
  const exclusions = hasExcludedZero ? [{ reason: "divisionByZero", operand: 1, excludedSet: RationalIntervalSet.point(ZERO) }] : [];
  const domain = domainRecord(unaryCoverage(input, definedInput), {
    definedInput,
    exclusions
  });
  return operationResult("reciprocal", [input], reciprocalSet(definedInput), domain);
}
function rangeDivide(leftValue, rightValue) {
  const left = asRationalIntervalSet(leftValue);
  const right = asRationalIntervalSet(rightValue);
  const definedRight = withoutZero(right);
  let coverage = "allDefined";
  if (!left.isEmpty && !right.isEmpty && right.containsValue(ZERO)) {
    coverage = definedRight.isEmpty ? "noDefinedInputs" : "partiallyDefined";
  }
  const exclusions = coverage === "allDefined" ? [] : [{ reason: "divisionByZero", operand: 2, excludedSet: RationalIntervalSet.point(ZERO) }];
  const domain = domainRecord(coverage, { exclusions });
  const range = multiplySets(left, reciprocalSet(definedRight));
  return operationResult("divide", [left, right], range, domain);
}
function rangeIntegerPower(value, exponentValue, options = {}) {
  const input = asRationalIntervalSet(value);
  const exponent = exactInteger(exponentValue);
  const zeroPowerZero = options.zeroPowerZero ?? "undefined";
  if (zeroPowerZero !== "undefined" && zeroPowerZero !== "one") {
    throw new TypeError("zeroPowerZero must be 'undefined' or 'one'");
  }
  if (exponent > 0n) {
    return operationResult("integerPower", [input], positiveIntegerPowerSet(input, exponent), totalDomain(), { exponent, zeroPowerZero });
  }
  if (exponent === 0n && zeroPowerZero === "one") {
    const range2 = input.isEmpty ? RationalIntervalSet.empty : RationalIntervalSet.point(ONE);
    return operationResult("integerPower", [input], range2, totalDomain(), { exponent, zeroPowerZero });
  }
  const definedInput = withoutZero(input);
  const hasExcludedZero = input.containsValue(ZERO);
  const exclusions = hasExcludedZero ? [{
    reason: exponent === 0n ? "zeroPowerZero" : "zeroToNegativePower",
    operand: 1,
    excludedSet: RationalIntervalSet.point(ZERO)
  }] : [];
  const domain = domainRecord(unaryCoverage(input, definedInput), {
    definedInput,
    exclusions
  });
  let range;
  if (exponent === 0n) {
    range = definedInput.isEmpty ? RationalIntervalSet.empty : RationalIntervalSet.point(ONE);
  } else {
    range = reciprocalSet(positiveIntegerPowerSet(definedInput, -exponent));
  }
  return operationResult("integerPower", [input], range, domain, { exponent, zeroPowerZero });
}
function operationName(value) {
  const match = /^rix\.core\.range\.([A-Za-z]+)@1$/.exec(value || "");
  return match?.[1] ?? null;
}
function recompute(operation, operands, parameters) {
  switch (operation) {
    case "negate":
      return rangeNegate(operands[0]);
    case "absoluteValue":
      return rangeAbsoluteValue(operands[0]);
    case "add":
      return rangeAdd(operands[0], operands[1]);
    case "subtract":
      return rangeSubtract(operands[0], operands[1]);
    case "multiply":
      return rangeMultiply(operands[0], operands[1]);
    case "reciprocal":
      return rangeReciprocal(operands[0]);
    case "divide":
      return rangeDivide(operands[0], operands[1]);
    case "integerPower":
      return rangeIntegerPower(operands[0], parameters.exponent, { zeroPowerZero: parameters.zeroPowerZero });
    default:
      return null;
  }
}
function sameExclusions(left, right) {
  if (left.length !== right.length)
    return false;
  return left.every((entry, index) => {
    const other = right[index];
    return entry.reason === other.reason && entry.operand === other.operand && entry.excludedSet.equals(other.excludedSet);
  });
}
function checkRangeOperationResult(candidate, expected = {}) {
  if (!candidate || candidate.schema !== RESULT_SCHEMA) {
    return Object.freeze({ accepted: false, reason: "unsupportedSchema", checkedBy: CHECKER_ID });
  }
  const operation = expected.operation ?? operationName(candidate.operation);
  const operands = expected.operands ?? candidate.operands;
  const parameters = expected.parameters ?? candidate.parameters ?? {};
  const recomputed = recompute(operation, operands, parameters);
  if (!recomputed) {
    return Object.freeze({ accepted: false, reason: "unsupportedRule", checkedBy: CHECKER_ID });
  }
  const accepted = candidate.range instanceof RationalIntervalSet && candidate.range.equals(recomputed.range) && candidate.domain?.coverage === recomputed.domain.coverage && sameExclusions(candidate.domain?.exclusions || [], recomputed.domain.exclusions);
  return Object.freeze({
    accepted,
    reason: accepted ? null : "claimMismatch",
    checkedBy: CHECKER_ID,
    operation,
    domainCoverage: recomputed.domain.coverage
  });
}

// ../../packages/core/src/fraction.js
class Fraction {
  #numerator;
  #denominator;
  static DEFAULT_STERN_BROCOT_PATH_LIMIT = 500;
  constructor(numerator, denominator = 1n, options = {}) {
    if (typeof numerator === "string") {
      const parts = numerator.trim().split("/");
      if (parts.length === 1) {
        this.#numerator = BigInt(parts[0]);
        this.#denominator = toExactBigInt(denominator, "Fraction denominator");
      } else if (parts.length === 2) {
        this.#numerator = BigInt(parts[0]);
        this.#denominator = BigInt(parts[1]);
      } else {
        throw new Error("Invalid fraction format. Use 'a/b' or 'a'");
      }
    } else {
      this.#numerator = toExactBigInt(numerator, "Fraction numerator");
      this.#denominator = toExactBigInt(denominator, "Fraction denominator");
    }
    if (this.#denominator === 0n) {
      if (this.#numerator === 0n) {
        throw new Error("The indeterminate fraction 0/0 is not allowed");
      }
      if (options.allowInfinite) {
        this._isInfinite = true;
      } else {
        throw new Error("Denominator cannot be zero unless allowInfinite is true");
      }
    } else {
      this._isInfinite = false;
    }
  }
  get numerator() {
    return this.#numerator;
  }
  get denominator() {
    return this.#denominator;
  }
  get isInfinite() {
    return this._isInfinite || false;
  }
  static #fromComponents(numerator, denominator) {
    return new Fraction(numerator, denominator, {
      allowInfinite: denominator === 0n
    });
  }
  add(other) {
    if (this.#denominator !== other.denominator) {
      throw new Error("Addition only supported for equal denominators");
    }
    return Fraction.#fromComponents(this.#numerator + other.numerator, this.#denominator);
  }
  subtract(other) {
    if (this.#denominator !== other.denominator) {
      throw new Error("Subtraction only supported for equal denominators");
    }
    return Fraction.#fromComponents(this.#numerator - other.numerator, this.#denominator);
  }
  multiply(other) {
    return Fraction.#fromComponents(this.#numerator * other.numerator, this.#denominator * other.denominator);
  }
  divide(other) {
    if (other.numerator === 0n) {
      throw new Error("Division by zero");
    }
    return Fraction.#fromComponents(this.#numerator * other.denominator, this.#denominator * other.numerator);
  }
  pow(exponent) {
    const n = toExactBigInt(exponent, "Exponent");
    if (n === 0n) {
      if (this.#numerator === 0n) {
        throw new Error("Zero cannot be raised to the power of zero");
      }
      return new Fraction(1, 1);
    }
    if (this.#numerator === 0n && n < 0n) {
      throw new Error("Zero cannot be raised to a negative power");
    }
    if (n < 0n) {
      return Fraction.#fromComponents(this.#denominator ** -n, this.#numerator ** -n);
    }
    return Fraction.#fromComponents(this.#numerator ** n, this.#denominator ** n);
  }
  scale(factor) {
    const scaleFactor = toExactBigInt(factor, "Fraction scale factor");
    return Fraction.#fromComponents(this.#numerator * scaleFactor, this.#denominator * scaleFactor);
  }
  static #gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
  static #compareValues(left, right) {
    if (left.isInfinite && right.isInfinite) {
      const leftSign = left.numerator < 0n ? -1 : 1;
      const rightSign = right.numerator < 0n ? -1 : 1;
      return leftSign < rightSign ? -1 : leftSign > rightSign ? 1 : 0;
    }
    if (left.isInfinite) {
      return left.numerator < 0n ? -1 : 1;
    }
    if (right.isInfinite) {
      return right.numerator < 0n ? 1 : -1;
    }
    let leftNumerator = left.numerator;
    let leftDenominator = left.denominator;
    let rightNumerator = right.numerator;
    let rightDenominator = right.denominator;
    if (leftDenominator < 0n) {
      leftNumerator = -leftNumerator;
      leftDenominator = -leftDenominator;
    }
    if (rightDenominator < 0n) {
      rightNumerator = -rightNumerator;
      rightDenominator = -rightDenominator;
    }
    const leftProduct = leftNumerator * rightDenominator;
    const rightProduct = rightNumerator * leftDenominator;
    return leftProduct < rightProduct ? -1 : leftProduct > rightProduct ? 1 : 0;
  }
  static #modInverse(value, modulus) {
    let oldR = (value % modulus + modulus) % modulus;
    let r = modulus;
    let oldS = 1n;
    let s = 0n;
    while (r !== 0n) {
      const quotient = oldR / r;
      [oldR, r] = [r, oldR - quotient * r];
      [oldS, s] = [s, oldS - quotient * s];
    }
    if (oldR !== 1n) {
      throw new Error("A modular inverse does not exist");
    }
    return (oldS % modulus + modulus) % modulus;
  }
  reduce() {
    if (this.isInfinite) {
      return new Fraction(this.#numerator < 0n ? -1n : 1n, 0n, {
        allowInfinite: true
      });
    }
    if (this.#numerator === 0n) {
      return new Fraction(0, 1);
    }
    const gcd2 = Fraction.#gcd(this.#numerator, this.#denominator);
    const reducedNum = this.#numerator / gcd2;
    const reducedDen = this.#denominator / gcd2;
    if (reducedDen < 0n) {
      return new Fraction(-reducedNum, -reducedDen);
    }
    return Fraction.#fromComponents(reducedNum, reducedDen);
  }
  static mediant(a, b) {
    return a.mediant(b);
  }
  toRational() {
    if (this.isInfinite) {
      throw new Error("Cannot convert an infinite Fraction to Rational");
    }
    return new Rational(this.#numerator, this.#denominator);
  }
  static fromRational(rational) {
    return new Fraction(rational.numerator, rational.denominator);
  }
  toString() {
    if (this.#denominator === 1n) {
      return this.#numerator.toString();
    }
    return `${this.#numerator}/${this.#denominator}`;
  }
  equals(other) {
    return this.#numerator === other.numerator && this.#denominator === other.denominator;
  }
  lessThan(other) {
    return Fraction.#compareValues(this, other) < 0;
  }
  lessThanOrEqual(other) {
    return Fraction.#compareValues(this, other) <= 0;
  }
  greaterThan(other) {
    return Fraction.#compareValues(this, other) > 0;
  }
  greaterThanOrEqual(other) {
    return Fraction.#compareValues(this, other) >= 0;
  }
  E(exponent) {
    const exp = toExactBigInt(exponent, "Exponent");
    if (exp >= 0n) {
      const newNumerator = this.#numerator * 10n ** exp;
      return Fraction.#fromComponents(newNumerator, this.#denominator);
    } else {
      const newDenominator = this.#denominator * 10n ** -exp;
      return Fraction.#fromComponents(this.#numerator, newDenominator);
    }
  }
  toJSON() {
    return {
      $ratmath: "Fraction",
      numerator: this.#numerator.toString(),
      denominator: this.#denominator.toString()
    };
  }
  mediant(other) {
    if (this.isInfinite && other.isInfinite) {
      if (this.#numerator === -1n && other.numerator === 1n) {
        return new Fraction(0n, 1n);
      } else if (this.#numerator === 1n && other.numerator === -1n) {
        return new Fraction(0n, 1n);
      }
      throw new Error("Cannot compute mediant of two infinite fractions");
    }
    if (this.isInfinite || other.isInfinite) {
      const newNum2 = this.#numerator + other.numerator;
      const newDen2 = this.#denominator + other.denominator;
      if (newNum2 === 0n && newDen2 === 0n) {
        throw new Error("Mediant would result in 0/0");
      }
      return Fraction.#fromComponents(newNum2, newDen2);
    }
    const newNum = this.#numerator + other.numerator;
    const newDen = this.#denominator + other.denominator;
    return Fraction.#fromComponents(newNum, newDen);
  }
  fareyParents() {
    if (this.isInfinite) {
      throw new Error("Cannot find Farey parents of infinite fraction");
    }
    const normalizedNumerator = this.#denominator < 0n ? -this.#numerator : this.#numerator;
    const normalizedDenominator = this.#denominator < 0n ? -this.#denominator : this.#denominator;
    const scale = Fraction.#gcd(normalizedNumerator, normalizedDenominator);
    const reducedNumerator = normalizedNumerator / scale;
    const reducedDenominator = normalizedDenominator / scale;
    if (reducedNumerator === 0n) {
      if (scale === 1n) {
        return {
          left: new Fraction(-1n, 0n, { allowInfinite: true }),
          right: new Fraction(1n, 0n, { allowInfinite: true })
        };
      }
      const leftDenominator2 = scale / 2n;
      return {
        left: new Fraction(-1n, leftDenominator2),
        right: new Fraction(1n, scale - leftDenominator2)
      };
    }
    let leftNumerator;
    let leftDenominator;
    let rightNumerator;
    let rightDenominator;
    if (reducedDenominator === 1n) {
      if (reducedNumerator > 0n) {
        leftNumerator = reducedNumerator - 1n;
        leftDenominator = 1n;
        rightNumerator = 1n;
        rightDenominator = 0n;
      } else {
        leftNumerator = -1n;
        leftDenominator = 0n;
        rightNumerator = reducedNumerator + 1n;
        rightDenominator = 1n;
      }
    } else {
      leftDenominator = Fraction.#modInverse(reducedNumerator, reducedDenominator);
      leftNumerator = (reducedNumerator * leftDenominator - 1n) / reducedDenominator;
      rightNumerator = reducedNumerator - leftNumerator;
      rightDenominator = reducedDenominator - leftDenominator;
    }
    let leftCopies = (scale * reducedDenominator - 2n * leftDenominator + reducedDenominator) / (2n * reducedDenominator);
    if (leftCopies < 0n) {
      leftCopies = 0n;
    } else if (leftCopies > scale - 1n) {
      leftCopies = scale - 1n;
    }
    const rightCopies = scale - 1n - leftCopies;
    return {
      left: Fraction.#fromComponents(leftNumerator + leftCopies * reducedNumerator, leftDenominator + leftCopies * reducedDenominator),
      right: Fraction.#fromComponents(rightNumerator + rightCopies * reducedNumerator, rightDenominator + rightCopies * reducedDenominator)
    };
  }
  static mediantPartner(endpoint, mediant) {
    return Fraction.#fromComponents(mediant.numerator - endpoint.numerator, mediant.denominator - endpoint.denominator);
  }
  static isMediantTriple(left, mediant, right) {
    if (mediant.isInfinite) {
      return false;
    }
    try {
      const computedMediant = left.mediant(right);
      return mediant.equals(computedMediant);
    } catch (error) {
      return false;
    }
  }
  static isFareyTriple(left, mediant, right) {
    if (!Fraction.isMediantTriple(left, mediant, right)) {
      return false;
    }
    if (mediant.numerator === 0n && mediant.denominator === 1n && left.denominator === 0n && right.denominator === 0n) {
      return left.numerator === -1n && right.numerator === 1n || left.numerator === 1n && right.numerator === -1n;
    }
    const determinant = left.numerator * right.denominator - left.denominator * right.numerator;
    const magnitude = determinant < 0n ? -determinant : determinant;
    return magnitude === Fraction.#gcd(mediant.numerator, mediant.denominator);
  }
  sternBrocotParent() {
    if (this.isInfinite) {
      throw new Error("Infinite fractions don't have parents in Stern-Brocot tree");
    }
    if (this.numerator === 0n && this.denominator === 1n) {
      return null;
    }
    const path = this.sternBrocotPath();
    if (path.length === 0) {
      return null;
    }
    const parentPath = path.slice(0, -1);
    return Fraction.fromSternBrocotPath(parentPath);
  }
  sternBrocotChildren() {
    if (this.isInfinite) {
      throw new Error("Infinite fractions don't have children in Stern-Brocot tree");
    }
    const currentPath = this.sternBrocotPath();
    const leftPath = [...currentPath, "L"];
    const rightPath = [...currentPath, "R"];
    return {
      left: Fraction.fromSternBrocotPath(leftPath),
      right: Fraction.fromSternBrocotPath(rightPath)
    };
  }
  sternBrocotPath(maxLength = Fraction.DEFAULT_STERN_BROCOT_PATH_LIMIT) {
    if (!Number.isSafeInteger(maxLength) || maxLength < 0) {
      throw new RangeError("Stern-Brocot path limit must be a nonnegative safe integer");
    }
    if (this.isInfinite) {
      throw new Error("Infinite fractions don't have tree paths");
    }
    const reduced = this.reduce();
    if (reduced.numerator === 0n && reduced.denominator === 1n) {
      return [];
    }
    let left = new Fraction(-1, 0, { allowInfinite: true });
    let right = new Fraction(1, 0, { allowInfinite: true });
    let current = new Fraction(0, 1);
    const path = [];
    while (!current.equals(reduced)) {
      if (reduced.lessThan(current)) {
        path.push("L");
        right = current;
        current = left.mediant(current);
      } else {
        path.push("R");
        left = current;
        current = current.mediant(right);
      }
      if (path.length > maxLength) {
        throw new Error("Stern-Brocot path too long - this may indicate a bug in the algorithm");
      }
    }
    return path;
  }
  static fromSternBrocotPath(path) {
    let left = new Fraction(-1, 0, { allowInfinite: true });
    let right = new Fraction(1, 0, { allowInfinite: true });
    let current = new Fraction(0, 1);
    for (const direction of path) {
      if (direction === "L") {
        right = current;
        current = left.mediant(current);
      } else if (direction === "R") {
        left = current;
        current = current.mediant(right);
      } else {
        throw new Error(`Invalid direction in path: ${direction}`);
      }
    }
    return current;
  }
  isSternBrocotValid() {
    if (this.isInfinite) {
      return this.numerator === 1n || this.numerator === -1n;
    }
    try {
      const path = this.sternBrocotPath();
      const reconstructed = Fraction.fromSternBrocotPath(path);
      return this.equals(reconstructed);
    } catch (error) {
      return false;
    }
  }
  sternBrocotDepth() {
    if (this.isInfinite) {
      return Infinity;
    }
    if (this.numerator === 0n && this.denominator === 1n) {
      return 0;
    }
    return this.sternBrocotPath().length;
  }
  sternBrocotAncestors() {
    if (this.isInfinite) {
      return [];
    }
    const ancestors = [];
    const path = this.sternBrocotPath();
    for (let i = 0;i < path.length; i++) {
      const partialPath = path.slice(0, i);
      ancestors.push(Fraction.fromSternBrocotPath(partialPath));
    }
    ancestors.reverse();
    return ancestors;
  }
}

// ../../packages/core/src/fraction-interval.js
class FractionInterval {
  #low;
  #high;
  constructor(a, b) {
    if (!(a instanceof Fraction) || !(b instanceof Fraction)) {
      throw new Error("FractionInterval endpoints must be Fraction objects");
    }
    if (a.lessThanOrEqual(b)) {
      this.#low = a;
      this.#high = b;
    } else {
      this.#low = b;
      this.#high = a;
    }
  }
  get low() {
    return this.#low;
  }
  get high() {
    return this.#high;
  }
  mediantSplit() {
    const mediant = Fraction.mediant(this.#low, this.#high);
    return [
      new FractionInterval(this.#low, mediant),
      new FractionInterval(mediant, this.#high)
    ];
  }
  partitionWithMediants(n = 1) {
    if (n < 0) {
      throw new Error("Depth of mediant partitioning must be non-negative");
    }
    if (n === 0) {
      return [this];
    }
    let intervals = [this];
    for (let level = 0;level < n; level++) {
      const newIntervals = [];
      for (const interval of intervals) {
        const splitIntervals = interval.mediantSplit();
        newIntervals.push(...splitIntervals);
      }
      intervals = newIntervals;
    }
    return intervals;
  }
  partitionWith(fn) {
    const partitionPoints = fn(this.#low, this.#high);
    if (!Array.isArray(partitionPoints)) {
      throw new Error("Partition function must return an array of Fractions");
    }
    for (const point of partitionPoints) {
      if (!(point instanceof Fraction)) {
        throw new Error("Partition function must return Fraction objects");
      }
    }
    const allPoints = [this.#low, ...partitionPoints, this.#high];
    allPoints.sort((a, b) => {
      if (a.equals(b))
        return 0;
      if (a.lessThan(b))
        return -1;
      return 1;
    });
    if (!allPoints[0].equals(this.#low) || !allPoints[allPoints.length - 1].equals(this.#high)) {
      throw new Error("Partition points should be within the interval");
    }
    const uniquePoints = [];
    for (let i = 0;i < allPoints.length; i++) {
      if (i === 0 || !allPoints[i].equals(allPoints[i - 1])) {
        uniquePoints.push(allPoints[i]);
      }
    }
    const intervals = [];
    for (let i = 0;i < uniquePoints.length - 1; i++) {
      intervals.push(new FractionInterval(uniquePoints[i], uniquePoints[i + 1]));
    }
    return intervals;
  }
  toRationalInterval() {
    return new RationalInterval(this.#low.toRational(), this.#high.toRational());
  }
  static fromRationalInterval(interval) {
    return new FractionInterval(Fraction.fromRational(interval.low), Fraction.fromRational(interval.high));
  }
  toString() {
    return `${this.#low.toString()}:${this.#high.toString()}`;
  }
  equals(other) {
    return this.#low.equals(other.low) && this.#high.equals(other.high);
  }
  E(exponent) {
    const newLow = this.#low.E(exponent);
    const newHigh = this.#high.E(exponent);
    return new FractionInterval(newLow, newHigh);
  }
  toJSON() {
    return { $ratmath: "FractionInterval", low: this.#low, high: this.#high };
  }
}

// ../../packages/core/src/integer.js
class Integer {
  #value;
  static zero = new Integer(0);
  static one = new Integer(1);
  constructor(value) {
    if (value instanceof Integer) {
      this.#value = value.value;
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      if (!/^-?\d+$/.test(trimmed)) {
        throw new Error("Invalid integer format. Must be a whole number");
      }
      this.#value = BigInt(trimmed);
    } else {
      this.#value = toExactBigInt(value, "Integer value");
    }
  }
  get value() {
    return this.#value;
  }
  add(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("add", this);
    }
    if (other instanceof Integer) {
      return new Integer(this.#value + other.value);
    } else if (other instanceof Rational) {
      const thisAsRational = new Rational(this.#value, 1n);
      return thisAsRational.add(other);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const thisAsRational = new Rational(this.#value, 1n);
      const IntervalClass = other.constructor;
      const thisAsInterval = new IntervalClass(thisAsRational, thisAsRational);
      return thisAsInterval.add(other);
    } else {
      throw new Error(`Cannot add ${other.constructor.name} to Integer`);
    }
  }
  subtract(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("subtract", this);
    }
    if (other instanceof Integer) {
      return new Integer(this.#value - other.value);
    } else if (other instanceof Rational) {
      const thisAsRational = new Rational(this.#value, 1n);
      return thisAsRational.subtract(other);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const thisAsRational = new Rational(this.#value, 1n);
      const IntervalClass = other.constructor;
      const thisAsInterval = new IntervalClass(thisAsRational, thisAsRational);
      return thisAsInterval.subtract(other);
    } else {
      throw new Error(`Cannot subtract ${other.constructor.name} from Integer`);
    }
  }
  multiply(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("multiply", this);
    }
    if (other instanceof Integer) {
      return new Integer(this.#value * other.value);
    } else if (other instanceof Rational) {
      const thisAsRational = new Rational(this.#value, 1n);
      return thisAsRational.multiply(other);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const thisAsRational = new Rational(this.#value, 1n);
      const IntervalClass = other.constructor;
      const thisAsInterval = new IntervalClass(thisAsRational, thisAsRational);
      return thisAsInterval.multiply(other);
    } else {
      throw new Error(`Cannot multiply Integer by ${other.constructor.name}`);
    }
  }
  divide(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("divide", this);
    }
    if (other instanceof Integer) {
      if (other.value === 0n) {
        throw new Error("Division by zero");
      }
      if (this.#value % other.value === 0n) {
        return new Integer(this.#value / other.value);
      } else {
        return new Rational(this.#value, other.value);
      }
    } else if (other instanceof Rational) {
      const thisAsRational = new Rational(this.#value, 1n);
      return thisAsRational.divide(other);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const thisAsRational = new Rational(this.#value, 1n);
      const IntervalClass = other.constructor;
      const thisAsInterval = new IntervalClass(thisAsRational, thisAsRational);
      return thisAsInterval.divide(other);
    } else {
      throw new Error(`Cannot divide Integer by ${other.constructor.name}`);
    }
  }
  possibleRelationsTo(other) {
    const point = new Rational(this.#value, 1n);
    if (other?.isCertifiedApproximation === true)
      other = other.enclosure;
    if (other instanceof Integer)
      return this.#value < other.value ? 1 : this.#value > other.value ? 4 : 2;
    if (other instanceof Rational)
      return point.lessThan(other) ? 1 : point.greaterThan(other) ? 4 : 2;
    if (other?.low && other?.high) {
      let mask = 0;
      if (point.lessThan(other.high))
        mask |= 1;
      if (other.low.lessThanOrEqual(point) && point.lessThanOrEqual(other.high))
        mask |= 2;
      if (point.greaterThan(other.low))
        mask |= 4;
      return mask;
    }
    throw new TypeError("Possible relations require a Core numeric value");
  }
  modulo(other) {
    if (other.value === 0n) {
      throw new Error("Modulo by zero");
    }
    return new Integer(this.#value % other.value);
  }
  negate() {
    return new Integer(-this.#value);
  }
  pow(exponent) {
    const exp = exponent instanceof Integer ? exponent.value : toExactBigInt(exponent, "Exponent");
    if (exp === 0n) {
      if (this.#value === 0n) {
        throw new Error("Zero cannot be raised to the power of zero");
      }
      return new Integer(1);
    }
    if (exp < 0n) {
      if (this.#value === 0n) {
        throw new Error("Zero cannot be raised to a negative power");
      }
      const positiveExp = -exp;
      const positiveResult = this.pow(positiveExp);
      return new Rational(1, positiveResult.value);
    }
    let result = 1n;
    let base = this.#value;
    let n = exp;
    while (n > 0n) {
      if (n & 1n) {
        result *= base;
      }
      base *= base;
      n >>= 1n;
    }
    return new Integer(result);
  }
  equals(other) {
    return this.#value === other.value;
  }
  compareTo(other) {
    if (this.#value < other.value)
      return -1;
    if (this.#value > other.value)
      return 1;
    return 0;
  }
  lessThan(other) {
    return this.#value < other.value;
  }
  lessThanOrEqual(other) {
    return this.#value <= other.value;
  }
  greaterThan(other) {
    return this.#value > other.value;
  }
  greaterThanOrEqual(other) {
    return this.#value >= other.value;
  }
  abs() {
    return this.#value < 0n ? this.negate() : new Integer(this.#value);
  }
  sign() {
    if (this.#value < 0n)
      return new Integer(-1);
    if (this.#value > 0n)
      return new Integer(1);
    return new Integer(0);
  }
  isEven() {
    return this.#value % 2n === 0n;
  }
  isOdd() {
    return this.#value % 2n !== 0n;
  }
  isZero() {
    return this.#value === 0n;
  }
  isPositive() {
    return this.#value > 0n;
  }
  isNegative() {
    return this.#value < 0n;
  }
  gcd(other) {
    let a = this.#value < 0n ? -this.#value : this.#value;
    let b = other.value < 0n ? -other.value : other.value;
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return new Integer(a);
  }
  lcm(other) {
    if (this.#value === 0n || other.value === 0n) {
      return new Integer(0);
    }
    const gcd2 = this.gcd(other);
    const product = this.multiply(other).abs();
    return product.divide(gcd2);
  }
  toString(base) {
    if (base === undefined) {
      return this.#value.toString();
    }
    if (base instanceof BaseSystem) {
      return base.fromDecimal(this.#value);
    }
    if (typeof base === "number") {
      if (base === 10) {
        return this.#value.toString();
      }
      return BaseSystem.fromBase(base).fromDecimal(this.#value);
    }
    return this.#value.toString();
  }
  toBase(baseSystem) {
    if (!(baseSystem instanceof BaseSystem)) {
      throw new Error("Argument must be a BaseSystem");
    }
    return baseSystem.fromDecimal(this.#value);
  }
  toNumber() {
    return Number(this.#value);
  }
  toRational() {
    return new Rational(this.#value, 1n);
  }
  static from(value) {
    if (value instanceof Integer) {
      return new Integer(value.value);
    }
    return new Integer(value);
  }
  static fromRational(rational) {
    if (rational.denominator !== 1n) {
      throw new Error("Rational is not a whole number");
    }
    return new Integer(rational.numerator);
  }
  E(exponent) {
    const exp = toExactBigInt(exponent, "Exponent");
    if (exp >= 0n) {
      const newValue = this.#value * 10n ** exp;
      return new Integer(newValue);
    } else {
      const powerOf10 = new Rational(1n, 10n ** -exp);
      const thisAsRational = new Rational(this.#value, 1n);
      return thisAsRational.multiply(powerOf10);
    }
  }
  factorial() {
    if (this.#value < 0n) {
      throw new Error("Factorial is not defined for negative integers");
    }
    if (this.#value === 0n || this.#value === 1n) {
      return new Integer(1);
    }
    let result = 1n;
    for (let i = 2n;i <= this.#value; i++) {
      result *= i;
    }
    return new Integer(result);
  }
  doubleFactorial() {
    if (this.#value < 0n) {
      throw new Error("Double factorial is not defined for negative integers");
    }
    if (this.#value === 0n || this.#value === 1n) {
      return new Integer(1);
    }
    let result = 1n;
    for (let i = this.#value;i > 0n; i -= 2n) {
      result *= i;
    }
    return new Integer(result);
  }
  bitLength() {
    if (this.#value === 0n)
      return 0;
    return this.#value < 0n ? (-this.#value).toString(2).length : this.#value.toString(2).length;
  }
  toJSON() {
    return { $ratmath: "Integer", value: this.#value.toString() };
  }
}

// ../../packages/core/src/certified-approximation.js
var Relation = Object.freeze({
  LESS: 1,
  EQUAL: 2,
  GREATER: 4
});
function asRational2(value, label = "value") {
  if (value instanceof Rational)
    return value;
  if (value instanceof Integer)
    return value.toRational();
  throw new TypeError(`${label} must be an Integer or Rational`);
}
function exactScalar(value) {
  const rational = asRational2(value);
  return rational.denominator === 1n ? new Integer(rational.numerator) : rational;
}
function pointInterval(value) {
  const rational = asRational2(value);
  return new RationalInterval(rational, rational);
}
function freezeRepresentation(value) {
  if (value === null || value === undefined)
    return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Approximation representation must be an object");
  }
  const copy = { ...value };
  if (Array.isArray(copy.certifiedPrefix)) {
    copy.certifiedPrefix = Object.freeze([...copy.certifiedPrefix]);
  }
  if (Array.isArray(copy.provisionalSuffix)) {
    copy.provisionalSuffix = Object.freeze([...copy.provisionalSuffix]);
  }
  if (copy.presentationHint && typeof copy.presentationHint === "object") {
    copy.presentationHint = Object.freeze({ ...copy.presentationHint });
  }
  if (copy.requested && typeof copy.requested === "object") {
    copy.requested = Object.freeze({ ...copy.requested });
  }
  if (copy.achieved && typeof copy.achieved === "object") {
    copy.achieved = Object.freeze({ ...copy.achieved });
  }
  return Object.freeze(copy);
}
function isPoint(interval) {
  return interval.low.equals(interval.high);
}
function normalize(candidate, enclosure, options = {}) {
  if (isPoint(enclosure) && options.preserveWrapper !== true) {
    return exactScalar(enclosure.low);
  }
  return new CertifiedApproximation(candidate, enclosure, options);
}
function operand(value) {
  if (value instanceof CertifiedApproximation) {
    return { candidate: value.candidate, enclosure: value.enclosure, approximation: true };
  }
  if (value instanceof RationalInterval) {
    return { candidate: null, enclosure: value, intervalCollection: true };
  }
  if (value instanceof Integer || value instanceof Rational) {
    return { candidate: value, enclosure: pointInterval(value), exact: true };
  }
  return null;
}
function presentationHint(value) {
  const rep = value?.representation;
  if (rep?.kind !== "radix")
    return null;
  const certified = String(rep.certifiedPrefix ?? "");
  const dot = certified.indexOf(".");
  return {
    base: rep.base,
    characters: rep.characters,
    certifiedFractionalDigits: dot === -1 ? 0 : certified.length - dot - 1,
    provisionalDigits: String(rep.provisionalSuffix ?? "").length
  };
}
function derivedOptions(left, right = null) {
  const hint = presentationHint(left) ?? presentationHint(right);
  return {
    representation: {
      kind: "derived",
      reason: "derived",
      original: null,
      ...hint ? { presentationHint: hint } : {}
    },
    sourceId: Symbol("ratmath-derived-approximation"),
    dependencies: right ? [left.sourceId, right.sourceId].filter(Boolean) : [left.sourceId].filter(Boolean)
  };
}
function decimalCylinder(interval, maxDigits = 100) {
  if (interval.low.lessThan(Rational.zero))
    return null;
  let scale = 1n;
  for (let digits = 0;digits <= maxDigits; digits++) {
    const lowNumerator = interval.low.numerator * scale;
    const highNumerator = interval.high.numerator * scale;
    if (lowNumerator % interval.low.denominator === 0n && highNumerator % interval.high.denominator === 0n) {
      const lowGrid = lowNumerator / interval.low.denominator;
      const highGrid = highNumerator / interval.high.denominator;
      if (highGrid === lowGrid + 1n)
        return { digits, scale, lowGrid };
    }
    scale *= 10n;
  }
  return null;
}
function fixedDecimalFromGrid(grid, digits) {
  const text = grid.toString();
  if (digits === 0)
    return text;
  const padded = text.padStart(digits + 1, "0");
  return `${padded.slice(0, -digits)}.${padded.slice(-digits)}`;
}
function candidateFractionalDigits(value, count) {
  const rational = asRational2(value);
  const numerator = rational.numerator < 0n ? -rational.numerator : rational.numerator;
  let remainder = numerator % rational.denominator;
  let result = "";
  for (let index = 0;index < count; index++) {
    remainder *= 10n;
    result += String(remainder / rational.denominator);
    remainder %= rational.denominator;
  }
  return result;
}
function serializeSourceId(sourceId) {
  return typeof sourceId === "string" || typeof sourceId === "number" ? sourceId : null;
}
function relationEnclosure(value) {
  if (value instanceof CertifiedApproximation)
    return value.enclosure;
  if (value instanceof RationalInterval)
    return value;
  if (value instanceof Integer || value instanceof Rational)
    return pointInterval(value);
  throw new TypeError("Possible relations require Core numeric values");
}
function possibleRelations(left, right) {
  if (left instanceof CertifiedApproximation && right instanceof CertifiedApproximation && left.sameSource(right)) {
    return Relation.EQUAL;
  }
  const a = relationEnclosure(left);
  const b = relationEnclosure(right);
  let result = 0;
  if (a.low.lessThan(b.high))
    result |= Relation.LESS;
  if (a.low.lessThanOrEqual(b.high) && b.low.lessThanOrEqual(a.high)) {
    result |= Relation.EQUAL;
  }
  if (a.high.greaterThan(b.low))
    result |= Relation.GREATER;
  return result;
}

class CertifiedApproximation {
  #candidate;
  #enclosure;
  #representation;
  #sourceId;
  #dependencies;
  constructor(candidate, enclosure, options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("Certified approximation options must be an object");
    }
    if (options.dependencies !== undefined && !Array.isArray(options.dependencies)) {
      throw new TypeError("Certified approximation dependencies must be an array");
    }
    if (options.sourceId !== undefined && !["string", "number", "symbol"].includes(typeof options.sourceId)) {
      throw new TypeError("Certified approximation sourceId must be a string, number, or symbol");
    }
    const exactCandidate = exactScalar(candidate);
    if (!(enclosure instanceof RationalInterval)) {
      throw new TypeError("Certified approximation enclosure must be a RationalInterval");
    }
    if (!enclosure.containsValue(asRational2(exactCandidate))) {
      throw new RangeError("Certified approximation candidate must lie in its enclosure");
    }
    this.#candidate = exactCandidate;
    this.#enclosure = enclosure;
    this.#representation = freezeRepresentation(options.representation);
    this.#sourceId = options.sourceId ?? Symbol("ratmath-certified-approximation");
    this.#dependencies = Object.freeze([...options.dependencies || []]);
  }
  get candidate() {
    return this.#candidate;
  }
  get enclosure() {
    return this.#enclosure;
  }
  get representation() {
    return this.#representation;
  }
  get sourceId() {
    return this.#sourceId;
  }
  get dependencies() {
    return this.#dependencies;
  }
  get low() {
    return this.#enclosure.low;
  }
  get high() {
    return this.#enclosure.high;
  }
  get isCertifiedApproximation() {
    return true;
  }
  sameSource(other) {
    return this === other || other instanceof CertifiedApproximation && this.#sourceId !== null && this.#sourceId !== undefined && this.#sourceId === other.sourceId;
  }
  copy() {
    return new CertifiedApproximation(this.#candidate, this.#enclosure, {
      representation: this.#representation,
      sourceId: this.#sourceId,
      dependencies: this.#dependencies
    });
  }
  #binary(other, operation) {
    const rhs = operand(other);
    if (!rhs)
      throw new TypeError(`Cannot ${operation} CertifiedApproximation and ${other?.constructor?.name ?? typeof other}`);
    if (rhs.intervalCollection) {
      return this.#enclosure[operation](rhs.enclosure);
    }
    if (rhs.approximation && this.sameSource(other)) {
      if (operation === "subtract")
        return Integer.zero;
      if (operation === "divide") {
        if (this.#enclosure.containsZero()) {
          throw new Error("Cannot divide an approximation containing zero by itself");
        }
        return Integer.one;
      }
    }
    const candidate = this.#candidate[operation](rhs.candidate);
    const enclosure = this.#enclosure[operation](rhs.enclosure);
    return normalize(candidate, enclosure, derivedOptions(this, rhs.approximation ? other : null));
  }
  add(other) {
    return this.#binary(other, "add");
  }
  subtract(other) {
    return this.#binary(other, "subtract");
  }
  multiply(other) {
    return this.#binary(other, "multiply");
  }
  divide(other) {
    return this.#binary(other, "divide");
  }
  _operateExactLeft(operation, left) {
    const lhs = operand(left);
    if (!lhs?.exact)
      throw new TypeError("Left operand must be an exact Core scalar");
    if (operation === "add" || operation === "multiply")
      return this[operation](left);
    const candidate = lhs.candidate[operation](this.#candidate);
    const enclosure = lhs.enclosure[operation](this.#enclosure);
    return normalize(candidate, enclosure, derivedOptions(this));
  }
  negate() {
    const representation = this.#representation?.kind === "radix" ? { ...this.#representation, original: this.#representation.original ? `-${this.#representation.original}`.replace(/^--/, "") : null } : { kind: "derived", reason: "derived", original: null };
    return normalize(this.#candidate.negate(), this.#enclosure.negate(), {
      representation,
      sourceId: Symbol("ratmath-derived-approximation"),
      dependencies: [this.#sourceId]
    });
  }
  reciprocal() {
    return normalize(asRational2(this.#candidate).reciprocal(), this.#enclosure.reciprocate(), derivedOptions(this));
  }
  pow(exponent) {
    return normalize(this.#candidate.pow(exponent), this.#enclosure.pow(exponent), derivedOptions(this));
  }
  E(exponent) {
    return normalize(this.#candidate.E(exponent), this.#enclosure.E(exponent), derivedOptions(this));
  }
  possibleRelationsTo(other) {
    return possibleRelations(this, other);
  }
  toRationalInterval() {
    return this.#enclosure;
  }
  toRational() {
    if (!isPoint(this.#enclosure)) {
      throw new Error("Cannot convert a non-point CertifiedApproximation to Rational");
    }
    return this.#enclosure.low;
  }
  toString() {
    if (this.#representation?.original)
      return this.#representation.original;
    const entirelyNegative = this.#enclosure.high.lessThan(Rational.zero);
    const displayEnclosure = entirelyNegative ? this.#enclosure.negate() : this.#enclosure;
    const hint = this.#representation?.presentationHint;
    const cylinder = hint?.base === 10 ? decimalCylinder(displayEnclosure) : null;
    if (cylinder) {
      const prefix = fixedDecimalFromGrid(cylinder.lowGrid, cylinder.digits);
      const provisionalCount = hint.provisionalDigits ?? 0;
      const displayCandidate2 = entirelyNegative ? this.#candidate.negate() : this.#candidate;
      const candidateDigits = candidateFractionalDigits(displayCandidate2, cylinder.digits + provisionalCount);
      const provisional = provisionalCount > 0 ? candidateDigits.slice(cylinder.digits, cylinder.digits + provisionalCount) : "";
      return `${entirelyNegative ? "-" : ""}${prefix}?${provisional}`;
    }
    const displayCandidate = entirelyNegative ? this.#candidate.negate() : this.#candidate;
    const candidateText = displayCandidate.toString();
    return `${entirelyNegative ? "-" : ""}${candidateText}?[=${displayEnclosure.low}:${displayEnclosure.high}]`;
  }
  toJSON() {
    return {
      $ratmath: "CertifiedApproximation",
      candidate: this.#candidate,
      enclosure: this.#enclosure,
      representation: this.#representation,
      sourceId: serializeSourceId(this.#sourceId),
      dependencies: this.#dependencies.map(serializeSourceId).filter((dependency) => dependency !== null)
    };
  }
}
function positionalRational(sign, integerDigits, fractionalDigits, baseSystem) {
  const integer = integerDigits.length ? baseSystem.toDecimal(integerDigits) : 0n;
  const fractional = fractionalDigits.length ? baseSystem.toDecimal(fractionalDigits) : 0n;
  const scale = BigInt(baseSystem.base) ** BigInt(fractionalDigits.length);
  return new Rational((sign < 0n ? -1n : 1n) * (integer * scale + fractional), scale);
}
function certifiedRadixPrefix({
  integerDigits,
  fractionalDigits = "",
  provisionalDigits = "",
  negative = false,
  baseSystem = BaseSystem.DECIMAL,
  enclosure = null,
  original = null,
  reason = "literal",
  requested = null,
  achieved = null,
  roundingMode = null,
  sourceId
}) {
  if (!(baseSystem instanceof BaseSystem))
    throw new TypeError("baseSystem must be a BaseSystem");
  if (!baseSystem.supportsPositionalFractions) {
    throw new RangeError("Certified radix prefixes require a conventional positional BaseSystem");
  }
  if (!baseSystem.isValidString(integerDigits || "0"))
    throw new Error("Invalid radix integer digits");
  if (fractionalDigits && !baseSystem.isValidString(fractionalDigits))
    throw new Error("Invalid radix fractional digits");
  if (provisionalDigits && !baseSystem.isValidString(provisionalDigits))
    throw new Error("Invalid provisional radix digits");
  const sign = negative ? -1n : 1n;
  const prefix = positionalRational(sign, integerDigits || "0", fractionalDigits, baseSystem);
  const candidateFraction = fractionalDigits + provisionalDigits;
  const candidate = positionalRational(sign, integerDigits || "0", candidateFraction, baseSystem);
  const width = new Rational(1n, BigInt(baseSystem.base) ** BigInt(fractionalDigits.length));
  const prefixHull = negative ? new RationalInterval(prefix.subtract(width), prefix) : new RationalInterval(prefix, prefix.add(width));
  const authoritative = enclosure ?? prefixHull;
  if (!prefixHull.contains(authoritative)) {
    throw new RangeError("Explicit enclosure must lie inside the certified radix prefix cylinder");
  }
  return new CertifiedApproximation(candidate, authoritative, {
    sourceId,
    representation: {
      kind: "radix",
      base: baseSystem.base,
      characters: baseSystem.characters.join(""),
      certifiedPrefix: `${negative ? "-" : ""}${integerDigits || "0"}${fractionalDigits.length || provisionalDigits.length ? `.${fractionalDigits}` : ""}`,
      provisionalSuffix: provisionalDigits,
      original,
      reason,
      requested,
      achieved: achieved ?? { fractionalDigits: fractionalDigits.length },
      roundingMode
    }
  });
}
function certifiedContinuedFractionPrefix({
  coefficients,
  provisionalCoefficients = [],
  original = null,
  reason = "literal",
  requested = null,
  achieved = null,
  sourceId
}) {
  const certified = coefficients.map((value) => toExactBigInt(value, "Continued-fraction coefficient"));
  const provisional = provisionalCoefficients.map((value) => toExactBigInt(value, "Provisional continued-fraction coefficient"));
  if (certified.length === 0)
    throw new Error("Continued-fraction approximation requires a certified coefficient");
  if (certified.slice(1).some((value) => value <= 0n) || provisional.some((value) => value <= 0n)) {
    throw new Error("Continued-fraction tail coefficients must be positive");
  }
  const convergent = Rational.fromContinuedFraction(certified);
  const adjacentCoefficients = [...certified];
  adjacentCoefficients[adjacentCoefficients.length - 1] += 1n;
  const adjacent = Rational.fromContinuedFraction(adjacentCoefficients);
  const candidate = Rational.fromContinuedFraction([...certified, ...provisional]);
  return new CertifiedApproximation(candidate, new RationalInterval(convergent, adjacent), {
    sourceId,
    representation: {
      kind: "continuedFraction",
      certifiedPrefix: certified.map(String),
      provisionalSuffix: provisional.map(String),
      original,
      reason,
      requested,
      achieved: achieved ?? { terms: certified.length }
    }
  });
}
function boundedDecimalApproximation(value, options = {}) {
  const fractionalDigits = options.fractionalDigits ?? 20;
  if (!Number.isSafeInteger(fractionalDigits) || fractionalDigits < 0) {
    throw new RangeError("fractionalDigits must be a nonnegative safe integer");
  }
  const rational = asRational2(value);
  const negative = rational.numerator < 0n;
  const numerator = negative ? -rational.numerator : rational.numerator;
  const integer = numerator / rational.denominator;
  let remainder = numerator % rational.denominator;
  let digits = "";
  for (let index = 0;index < fractionalDigits && remainder !== 0n; index++) {
    remainder *= 10n;
    digits += String(remainder / rational.denominator);
    remainder %= rational.denominator;
  }
  if (remainder === 0n)
    return exactScalar(rational);
  const original = `${negative ? "-" : ""}${integer}.${digits}?`;
  return certifiedRadixPrefix({
    integerDigits: String(integer),
    fractionalDigits: digits,
    negative,
    original,
    reason: options.reason ?? "truncated",
    requested: { fractionalDigits },
    achieved: { fractionalDigits: digits.length }
  });
}
function boundedContinuedFractionApproximation(value, options = {}) {
  const maxTerms = options.maxTerms ?? Rational.DEFAULT_CF_LIMIT;
  if (!Number.isSafeInteger(maxTerms) || maxTerms < 1) {
    throw new RangeError("maxTerms must be a positive safe integer");
  }
  const rational = asRational2(value);
  const coefficients = rational.toContinuedFraction({ maxTerms });
  const extended = rational.toContinuedFraction({ maxTerms: maxTerms + 1 });
  if (extended.length <= maxTerms)
    return exactScalar(rational);
  const [first, ...tail] = coefficients;
  const original = tail.length ? `${first}.~${tail.join("~")}?` : `${first}.~?`;
  return certifiedContinuedFractionPrefix({
    coefficients,
    original,
    reason: options.reason ?? "truncated",
    requested: { maxTerms },
    achieved: { terms: coefficients.length }
  });
}

// ../../packages/core/src/type-promotion.js
class TypePromotion {
  constructor() {
    throw new TypeError("TypePromotion is a static utility class");
  }
  static getTypeLevel(value) {
    if (value instanceof Integer)
      return 0;
    if (value instanceof Rational)
      return 1;
    if (value instanceof RationalInterval)
      return 2;
    if (value instanceof CertifiedApproximation) {
      throw new Error("CertifiedApproximation is scalar uncertainty, not a linear promotion level");
    }
    throw new Error(`Unknown type: ${value.constructor.name}`);
  }
  static integerToRational(integer) {
    return new Rational(integer.value, 1n);
  }
  static rationalToInterval(rational) {
    return new RationalInterval(rational, rational);
  }
  static integerToInterval(integer) {
    const rational = TypePromotion.integerToRational(integer);
    return TypePromotion.rationalToInterval(rational);
  }
  static promoteToLevel(value, targetLevel) {
    const currentLevel = TypePromotion.getTypeLevel(value);
    if (!Number.isInteger(targetLevel) || targetLevel < 0 || targetLevel > 2) {
      throw new Error(`Invalid target level: ${targetLevel}`);
    }
    if (currentLevel === targetLevel) {
      return value;
    }
    if (currentLevel > targetLevel) {
      throw new Error(`Cannot demote from level ${currentLevel} to level ${targetLevel}`);
    }
    let promoted = value;
    for (let level = currentLevel;level < targetLevel; level++) {
      if (level === 0) {
        promoted = TypePromotion.integerToRational(promoted);
      } else if (level === 1) {
        promoted = TypePromotion.rationalToInterval(promoted);
      }
    }
    return promoted;
  }
  static promoteToCommonType(a, b) {
    const levelA = TypePromotion.getTypeLevel(a);
    const levelB = TypePromotion.getTypeLevel(b);
    const targetLevel = Math.max(levelA, levelB);
    return [
      TypePromotion.promoteToLevel(a, targetLevel),
      TypePromotion.promoteToLevel(b, targetLevel)
    ];
  }
  static add(a, b) {
    if (a instanceof RationalInterval && b instanceof CertifiedApproximation)
      return a.add(b.enclosure);
    if (b instanceof RationalInterval && a instanceof CertifiedApproximation)
      return a.enclosure.add(b);
    if (a instanceof CertifiedApproximation)
      return a.add(b);
    if (b instanceof CertifiedApproximation)
      return b._operateExactLeft("add", a);
    const [promotedA, promotedB] = TypePromotion.promoteToCommonType(a, b);
    return promotedA.add(promotedB);
  }
  static subtract(a, b) {
    if (a instanceof RationalInterval && b instanceof CertifiedApproximation)
      return a.subtract(b.enclosure);
    if (b instanceof RationalInterval && a instanceof CertifiedApproximation)
      return a.enclosure.subtract(b);
    if (a instanceof CertifiedApproximation)
      return a.subtract(b);
    if (b instanceof CertifiedApproximation)
      return b._operateExactLeft("subtract", a);
    const [promotedA, promotedB] = TypePromotion.promoteToCommonType(a, b);
    return promotedA.subtract(promotedB);
  }
  static multiply(a, b) {
    if (a instanceof RationalInterval && b instanceof CertifiedApproximation)
      return a.multiply(b.enclosure);
    if (b instanceof RationalInterval && a instanceof CertifiedApproximation)
      return a.enclosure.multiply(b);
    if (a instanceof CertifiedApproximation)
      return a.multiply(b);
    if (b instanceof CertifiedApproximation)
      return b._operateExactLeft("multiply", a);
    const [promotedA, promotedB] = TypePromotion.promoteToCommonType(a, b);
    return promotedA.multiply(promotedB);
  }
  static divide(a, b) {
    if (a instanceof RationalInterval && b instanceof CertifiedApproximation)
      return a.divide(b.enclosure);
    if (b instanceof RationalInterval && a instanceof CertifiedApproximation)
      return a.enclosure.divide(b);
    if (a instanceof CertifiedApproximation)
      return a.divide(b);
    if (b instanceof CertifiedApproximation)
      return b._operateExactLeft("divide", a);
    if (a instanceof Integer && b instanceof Integer) {
      return a.divide(b);
    }
    const [promotedA, promotedB] = TypePromotion.promoteToCommonType(a, b);
    return promotedA.divide(promotedB);
  }
  static eNotation(base, exponent) {
    return base.E(exponent);
  }
  static power(base, exponent) {
    return base.pow(exponent);
  }
  static multiplyPower(base, exponent) {
    if (base.mpow && typeof base.mpow === "function") {
      return base.mpow(exponent);
    }
    return base.pow(exponent);
  }
  static negate(value) {
    if (value instanceof Integer) {
      return value.negate();
    } else if (value instanceof Rational) {
      return value.negate();
    } else if (value instanceof RationalInterval) {
      const negOne = new Rational(-1n, 1n);
      const negInterval = new RationalInterval(negOne, negOne);
      return negInterval.multiply(value);
    }
    throw new Error(`Cannot negate unknown type: ${value.constructor.name}`);
  }
  static determineTypeFromString(str) {
    if (str.includes("?"))
      return "approximation";
    if (str.includes(":") || str.includes("[") && str.includes("]")) {
      return "interval";
    }
    if (str.includes("/") || str.includes("..") || str.includes(".")) {
      return "rational";
    }
    return "integer";
  }
}

// ../../packages/core/src/numeral-system.js
var NUMERAL_SYSTEM_SCHEMA = "ratmath.numeral-system@1";
var NUMERAL_LIMITS = Object.freeze({ tokens: 256, tokenLength: 32, sourceLength: 65536, digits: 4096, bits: 16384 });
var reserved = /[\s+\-*/^!()[\]:.#~_`?\\]/u;
var fail = (message) => {
  throw new Error(`Numeral system: ${message}`);
};
var abs = (value) => value < 0n ? -value : value;
function boundedInteger(value) {
  if (typeof value !== "bigint" || abs(value).toString(2).length > NUMERAL_LIMITS.bits)
    fail("exact component exceeds 16384 bits");
  return value;
}
function exact(value) {
  const result = value instanceof Rational ? value : value instanceof Integer ? new Rational(value.value) : typeof value === "bigint" ? new Rational(value) : null;
  if (!result)
    fail("requires an exact Rational or Integer");
  boundedInteger(result.numerator);
  boundedInteger(result.denominator);
  return result;
}
function floor(value) {
  let q = value.numerator / value.denominator;
  if (value.numerator < 0n && value.numerator % value.denominator)
    q--;
  return q;
}
function digitLimit(value = 256) {
  if (!Number.isSafeInteger(value) || value < 0 || value > NUMERAL_LIMITS.digits)
    fail("maxDigits must be 0..4096");
  return value;
}
var rational = (value) => new Rational(value);
var key = (value) => `${value.numerator}/${value.denominator}`;

class NumeralSystem {
  constructor({ schema = NUMERAL_SYSTEM_SCHEMA, kind = "ordinary", radix, tokens } = {}) {
    if (schema !== NUMERAL_SYSTEM_SCHEMA)
      fail("unsupported schema");
    if (!["ordinary", "multiToken", "balanced", "negative"].includes(kind))
      fail("unsupported family");
    if (!Number.isSafeInteger(radix) || Math.abs(radix) < 2 || Math.abs(radix) > NUMERAL_LIMITS.tokens)
      fail("absolute radix must be 2..256");
    if (kind === "negative" !== radix < 0)
      fail("negative family requires negative radix; other families require positive radix");
    if (kind === "balanced" && radix % 2 === 0)
      fail("balanced systems require an odd radix");
    if (!Array.isArray(tokens) || tokens.length !== Math.abs(radix))
      fail("requires exactly one token for each digit value");
    for (const token of tokens) {
      if (typeof token !== "string" || !token.length || [...token].length > NUMERAL_LIMITS.tokenLength || reserved.test(token))
        fail("tokens must be nonempty, bounded and disjoint from numeral punctuation");
      if (kind === "ordinary" && [...token].length !== 1)
        fail("ordinary systems require one Unicode character per token");
    }
    for (let i = 0;i < tokens.length; i++)
      for (let j = i + 1;j < tokens.length; j++) {
        if (tokens[i].startsWith(tokens[j]) || tokens[j].startsWith(tokens[i]))
          fail("tokens must be unique and prefix-free");
      }
    this.schema = schema;
    this.kind = kind;
    this.radix = radix;
    this.offset = kind === "balanced" ? -(radix - 1) / 2 : 0;
    this.tokens = Object.freeze([...tokens]);
    Object.freeze(this);
  }
  toJSON() {
    return { schema: this.schema, kind: this.kind, radix: this.radix, tokens: [...this.tokens] };
  }
  tokenize(source, { allowEmpty = false } = {}) {
    if (typeof source !== "string" || source.length > NUMERAL_LIMITS.sourceLength)
      fail("source length budget exceeded");
    const result = [];
    for (let offset = 0;offset < source.length; ) {
      if (source[offset] === "_") {
        if (!result.length || offset + 1 === source.length || source[offset + 1] === "_")
          fail("group separators must lie between tokens");
        offset++;
        continue;
      }
      const index = this.tokens.findIndex((token) => source.startsWith(token, offset));
      if (index < 0)
        fail(`invalid token at position ${offset + 1}`);
      result.push(index + this.offset);
      offset += this.tokens[index].length;
      if (result.length > NUMERAL_LIMITS.digits)
        fail("digit work budget exceeded");
    }
    if (!result.length && !allowEmpty)
      fail("requires at least one digit");
    return result;
  }
  fromDigits(digits) {
    if (!Array.isArray(digits) || digits.length > NUMERAL_LIMITS.digits || digits.some((digit) => !Number.isInteger(digit) || digit < this.offset || digit >= this.offset + this.tokens.length))
      fail("invalid or oversized digit array");
    let result = 0n;
    for (const digit of digits)
      result = boundedInteger(result * BigInt(this.radix) + BigInt(digit));
    return result;
  }
  parseInteger(source) {
    let sign = 1n;
    if (/^[+-]/.test(source)) {
      if (source[0] === "-")
        sign = -1n;
      source = source.slice(1);
    }
    return sign * this.fromDigits(this.tokenize(source));
  }
  parse(source) {
    if (typeof source !== "string" || source.length > NUMERAL_LIMITS.sourceLength)
      fail("source length budget exceeded");
    source = source.trim();
    if (!source)
      fail("empty numeral");
    const shifts = source.split("_^");
    if (shifts.length > 2 || shifts.length === 2 && !shifts[1])
      fail("invalid radix shift");
    source = shifts[0];
    let result;
    if (source.includes(".~")) {
      const parts = source.replace(/^~/, "").replace(".~", "~").split("~");
      if (parts.length < 2 || parts.length > 256)
        fail("continued-fraction term budget exceeded");
      const terms = parts.map((term) => this.parseInteger(term));
      if (terms.slice(1).some((term) => term <= 0n))
        fail("continued-fraction tails must be positive");
      result = rational(terms.pop());
      while (terms.length)
        result = exact(rational(terms.pop()).add(rational(1n).divide(result)));
    } else if (source.includes("..")) {
      const parts = source.split("..");
      if (parts.length !== 2 || parts[1].split("/").length !== 2)
        fail("mixed numeral requires whole..numerator/denominator");
      const whole = this.parseInteger(parts[0]), [n, d] = parts[1].split("/").map((text) => this.parseInteger(text));
      if (n < 0n || d <= 0n)
        fail("mixed fractional components must be nonnegative with positive denominator");
      result = rational(whole).add(new Rational(whole < 0n || parts[0].startsWith("-") ? -n : n, d));
    } else if (source.includes("/")) {
      const parts = source.split("/");
      if (parts.length !== 2)
        fail("fraction requires one slash");
      result = new Rational(this.parseInteger(parts[0]), this.parseInteger(parts[1]));
    } else {
      let sign = 1n;
      if (/^[+-]/.test(source)) {
        if (source[0] === "-")
          sign = -1n;
        source = source.slice(1);
      }
      const sections = source.split("#");
      if (sections.length > 2 || sections.length === 2 && !sections[1])
        fail("repeat requires one nonempty block");
      const point = sections[0].split(".");
      if (point.every((text) => !text))
        fail("requires at least one digit");
      if (point.length > 2)
        fail("multiple radix points");
      const whole = this.fromDigits(this.tokenize(point[0], { allowEmpty: point.length === 2 }));
      const prefix = this.tokenize(point[1] || "", { allowEmpty: true });
      const base = BigInt(this.radix), power = boundedInteger(base ** BigInt(prefix.length));
      result = rational(whole).add(new Rational(this.fromDigits(prefix), power));
      if (sections.length === 2) {
        const repeated = this.tokenize(sections[1]);
        const denominator = boundedInteger(power * (base ** BigInt(repeated.length) - 1n));
        result = result.add(new Rational(this.fromDigits(repeated), denominator));
      }
      if (sign < 0n)
        result = result.negate();
    }
    if (shifts.length === 2) {
      const exponent = this.parseInteger(shifts[1]);
      if (abs(exponent) > 4096n)
        fail("radix shift budget exceeded");
      const power = boundedInteger(BigInt(this.radix) ** abs(exponent));
      result = exponent < 0n ? result.divide(rational(power)) : result.multiply(rational(power));
    }
    return exact(result);
  }
  integer(value, maxDigits = NUMERAL_LIMITS.digits) {
    boundedInteger(value);
    digitLimit(maxDigits);
    const negative = this.kind !== "balanced" && this.radix > 0 && value < 0n;
    let remaining = negative ? -value : value;
    const digits = [], carries = [];
    const modulus = BigInt(Math.abs(this.radix)), base = BigInt(this.radix);
    do {
      if (digits.length >= maxDigits)
        return { status: "budgetExhausted", digits: digits.reverse(), carries, remaining, negative, spelling: null };
      const residue = (remaining % modulus + modulus) % modulus;
      const digit = Number((residue - BigInt(this.offset) + modulus) % modulus) + this.offset;
      const next = (remaining - BigInt(digit)) / base;
      carries.push({ before: remaining, digit, radix: this.radix, after: next });
      digits.push(digit);
      remaining = next;
    } while (remaining !== 0n);
    digits.reverse();
    return { status: "complete", digits, carries, remaining, negative, spelling: `${negative ? "-" : ""}${this.digitText(digits)}` };
  }
  digitText(digits) {
    return digits.map((digit) => this.tokens[digit - this.offset]).join("");
  }
  format(value, { maxDigits = 256, mode = "expansion" } = {}) {
    const source = exact(value);
    digitLimit(maxDigits);
    if (!["expansion", "fraction"].includes(mode))
      fail("format mode must be expansion or fraction");
    if (mode === "fraction") {
      const numerator = this.integer(source.numerator, maxDigits), denominator = this.integer(source.denominator, maxDigits);
      return { schema: "ratmath.numeral-expansion@1", system: this.toJSON(), source, mode, status: numerator.spelling && denominator.spelling ? "complete" : "budgetExhausted", spelling: numerator.spelling && denominator.spelling ? `${numerator.spelling}/${denominator.spelling}` : null, numerator, denominator };
    }
    const negative = this.radix > 0 && this.offset === 0 && source.numerator < 0n;
    const working = negative ? source.negate() : source;
    const lower = this.offset < 0 ? new Rational(-1, 2) : this.radix < 0 ? new Rational(this.radix, 1 - this.radix) : rational(0n);
    const whole = floor(working.subtract(lower)), integer = this.integer(whole, maxDigits);
    let remainder = working.subtract(rational(whole)), repeatStart = null;
    const fractional = [], seen = new Map, steps = [];
    if (integer.status === "complete")
      while (remainder.numerator !== 0n) {
        const id = key(remainder);
        if (seen.has(id)) {
          repeatStart = seen.get(id);
          break;
        }
        if (integer.digits.length + fractional.length >= maxDigits)
          break;
        seen.set(id, fractional.length);
        const scaled = remainder.multiply(rational(BigInt(this.radix)));
        let digit = Number(floor(scaled.subtract(lower)));
        digit = Math.max(this.offset, Math.min(this.offset + this.tokens.length - 1, digit));
        const next = exact(scaled.subtract(rational(BigInt(digit))));
        steps.push({ before: remainder, scaled, digit, after: next });
        fractional.push(digit);
        remainder = next;
      }
    const complete = integer.status === "complete" && (remainder.numerator === 0n || repeatStart !== null);
    const prefix = repeatStart === null ? fractional : fractional.slice(0, repeatStart), repeat = repeatStart === null ? [] : fractional.slice(repeatStart);
    const partial = integer.spelling === null ? null : `${negative ? "-" : ""}${integer.spelling}${fractional.length || repeat.length ? "." + this.digitText(prefix) : ""}${repeat.length ? "#" + this.digitText(repeat) : ""}`;
    const spelling = complete ? partial : null;
    return { schema: "ratmath.numeral-expansion@1", system: this.toJSON(), source, mode, status: complete ? "complete" : "budgetExhausted", spelling, partial, negative, integer, prefix, repeat, steps, remaining: remainder, maxDigits, work: integer.digits.length + fractional.length };
  }
  locale(source, { point = ".", group = ",", groupSize = 3 } = {}, direction = "format") {
    if (typeof point !== "string" || typeof group !== "string" || !point.length || !group.length || point.length > 4 || group.length > 4 || point.startsWith(group) || group.startsWith(point))
      fail("locale separators must be distinct, bounded and nonempty");
    if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 8)
      fail("locale groupSize must be 1..8");
    for (const separator of [point, group]) {
      if (/[+\-*/^!()[\]:#~`?\\]/u.test(separator) || this.tokens.some((token) => token.includes(separator) || separator.includes(token)))
        fail("locale separator collides with numeral tokens or grammar");
    }
    if (typeof source !== "string" || source.length > NUMERAL_LIMITS.sourceLength)
      fail("source length budget exceeded");
    if (!["format", "parse"].includes(direction))
      fail("locale direction must be format or parse");
    const encode = (canonical2) => {
      if (/[\/~]|\.\.|_\^/.test(canonical2))
        fail("locale adapters support positional expansions only");
      this.parse(canonical2);
      const sign = /^[+-]/.test(canonical2) ? canonical2[0] : "";
      const body = sign ? canonical2.slice(1) : canonical2;
      const pieces = body.split(".");
      if (pieces.length === 1 && body.includes("#"))
        return encode(sign + body.replace("#", ".#"));
      const values = this.tokenize(pieces[0]);
      const groups = [];
      for (let stop = values.length;stop > 0; stop -= groupSize)
        groups.unshift(this.digitText(values.slice(Math.max(0, stop - groupSize), stop)));
      return sign + groups.join(group) + (pieces.length === 2 ? point + pieces[1] : "");
    };
    if (direction === "format")
      return encode(source);
    let canonical = "";
    for (let offset = 0;offset < source.length; ) {
      if (source.startsWith(point, offset)) {
        canonical += ".";
        offset += point.length;
      } else if (source.startsWith(group, offset))
        offset += group.length;
      else {
        const token = this.tokens.find((token2) => source.startsWith(token2, offset));
        canonical += token ?? source[offset];
        offset += token?.length ?? 1;
      }
    }
    if (encode(canonical) !== source)
      fail("noncanonical locale grouping");
    return this.parse(canonical);
  }
  normalize(source, options) {
    return this.format(this.parse(source), options);
  }
  places(source) {
    source = source.trim();
    const value = this.parse(source);
    if (/[#/~]|\.\.|_\^/.test(source))
      return { value, places: [], diagnostic: "Compound numeral: inspect its exact value and normalized expansion." };
    let sign = 1n;
    if (/^[+-]/.test(source)) {
      if (source[0] === "-")
        sign = -1n;
      source = source.slice(1);
    }
    const [a, b = ""] = source.split("."), whole = this.tokenize(a, { allowEmpty: true }), fraction = this.tokenize(b, { allowEmpty: true });
    const digits = [...whole, ...fraction];
    return { value, places: digits.map((digit, index) => {
      const exponent = whole.length - index - 1, power = BigInt(this.radix) ** BigInt(Math.abs(exponent));
      const weight = exponent < 0 ? new Rational(1n, power) : rational(power);
      return { token: this.tokens[digit - this.offset], digit, exponent, weight, contribution: weight.multiply(rational(sign * BigInt(digit))) };
    }) };
  }
}

// ../../packages/core/src/number-parser.js
var DIGITS = String.raw`\d(?:_?\d)*`;
var MAX_EXPANDED_DIGITS = 1e5;
function inputString(input, label = "number") {
  if (typeof input !== "string") {
    throw new TypeError(`${label} must be a string`);
  }
  const value = input.trim();
  if (value.length === 0) {
    throw new Error(`${label} cannot be empty`);
  }
  return value;
}
function cleanDigits(value, { signed = false } = {}) {
  const pattern = signed ? new RegExp(`^[+-]?${DIGITS}$`) : new RegExp(`^${DIGITS}$`);
  if (!pattern.test(value)) {
    throw new Error(`Invalid decimal digits: ${value}`);
  }
  return value.replaceAll("_", "");
}
function validateUnderscores(value) {
  for (let index = 0;index < value.length; index++) {
    if (value[index] !== "_")
      continue;
    if (!/\d/.test(value[index - 1] ?? "") || !/\d/.test(value[index + 1] ?? "")) {
      throw new Error("Underscore separators must be between decimal digits");
    }
  }
}
function expandDigitRuns(value) {
  let expandedLength = 0;
  const expanded = value.replace(/\{(\d+)~(\d+)\}/g, (_match, digits, countText) => {
    const count = Number(countText);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(`Invalid repeated-digit count: ${countText}`);
    }
    expandedLength += digits.length * count;
    if (expandedLength > MAX_EXPANDED_DIGITS) {
      throw new Error(`Expanded decimal exceeds ${MAX_EXPANDED_DIGITS} digits`);
    }
    return digits.repeat(count);
  });
  if (/[{}]/.test(expanded)) {
    throw new Error(`Invalid repeated-digit notation: ${value}`);
  }
  if (expanded.length > MAX_EXPANDED_DIGITS) {
    throw new Error(`Decimal exceeds ${MAX_EXPANDED_DIGITS} digits`);
  }
  return expanded;
}
function parseDecimalValue(input) {
  let value = inputString(input, "decimal");
  validateUnderscores(value);
  let sign = 1n;
  if (value.startsWith("+") || value.startsWith("-")) {
    sign = value[0] === "-" ? -1n : 1n;
    value = value.slice(1);
  }
  const hashParts = value.split("#");
  if (hashParts.length > 2) {
    throw new Error("A repeating decimal can contain only one '#'");
  }
  let prefix = expandDigitRuns(hashParts[0].replaceAll("_", ""));
  const repeating = hashParts.length === 2 ? expandDigitRuns(hashParts[1].replaceAll("_", "")) : null;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(prefix)) {
    throw new Error(`Invalid decimal format: ${input}`);
  }
  const dot = prefix.indexOf(".");
  const integerDigits = dot === -1 ? prefix : prefix.slice(0, dot) || "0";
  const fractionalDigits = dot === -1 ? "" : prefix.slice(dot + 1);
  const integer = BigInt(integerDigits);
  const fractional = fractionalDigits.length === 0 ? 0n : BigInt(fractionalDigits);
  const fractionalScale = 10n ** BigInt(fractionalDigits.length);
  let result = new Rational(integer * fractionalScale + fractional, fractionalScale);
  if (repeating !== null) {
    if (!/^\d+$/.test(repeating)) {
      throw new Error("The repeating part must contain one or more digits");
    }
    if (!/^0+$/.test(repeating)) {
      const repeatScale = 10n ** BigInt(repeating.length) - 1n;
      result = result.add(new Rational(BigInt(repeating), fractionalScale * repeatScale));
    }
  }
  return sign < 0n ? result.negate() : result;
}
function parseRationalLiteral(input) {
  let value = inputString(input, "rational");
  if (value.startsWith("~")) {
    value = value.slice(1);
  }
  const continued = value.match(new RegExp(`^([+-]?${DIGITS})\\.~(${DIGITS}(?:~${DIGITS})*)$`));
  if (continued) {
    const first = BigInt(cleanDigits(continued[1], { signed: true }));
    const tail = continued[2].split("~").map((term) => BigInt(cleanDigits(term)));
    if (tail.length === 1 && tail[0] === 0n) {
      return new Rational(first);
    }
    return Rational.fromContinuedFraction([first, ...tail]);
  }
  const mixed = value.match(new RegExp(`^([+-]?)(${DIGITS})\\.\\.(${DIGITS})\\/(${DIGITS})$`));
  if (mixed) {
    const sign = mixed[1] === "-" ? -1n : 1n;
    const whole = BigInt(cleanDigits(mixed[2]));
    const numerator = BigInt(cleanDigits(mixed[3]));
    const denominator = BigInt(cleanDigits(mixed[4]));
    if (denominator === 0n) {
      throw new Error("Denominator cannot be zero");
    }
    return new Rational(sign * (whole * denominator + numerator), denominator);
  }
  const fraction = value.match(new RegExp(`^([+-]?${DIGITS})\\/(${DIGITS})$`));
  if (fraction) {
    return new Rational(BigInt(cleanDigits(fraction[1], { signed: true })), BigInt(cleanDigits(fraction[2])));
  }
  if (value.includes("#") || value.includes(".")) {
    return parseDecimalValue(value);
  }
  if (new RegExp(`^[+-]?${DIGITS}$`).test(value)) {
    return new Rational(BigInt(cleanDigits(value, { signed: true })));
  }
  throw new Error(`Invalid rational number: ${input}`);
}
function decimalShape(input) {
  const match = input.match(new RegExp(`^([+-]?)(?:(${DIGITS})(?:\\.(${DIGITS})?)?|\\.(${DIGITS}))$`));
  if (!match) {
    throw new Error("Decimal interval notation requires an integer or finite decimal base");
  }
  const sign = match[1] === "-" ? "-" : "";
  const integer = match[2] ? cleanDigits(match[2]) : "0";
  const fractional = match[3] ? cleanDigits(match[3]) : match[4] ? cleanDigits(match[4]) : "";
  const hasPoint = input.includes(".");
  return {
    sign,
    integer,
    fractional,
    hasPoint,
    normalized: `${sign}${integer}${hasPoint ? `.${fractional}` : ""}`
  };
}
function parseOffset(value) {
  const normalized = value.startsWith("#") ? `0.${value}` : value;
  return parseRationalLiteral(normalized);
}
function scaledOffset(value, decimalPlaces, hasPoint) {
  const offset = parseOffset(value);
  if (!hasPoint)
    return offset;
  return offset.divide(new Rational(10n ** BigInt(decimalPlaces)));
}
function parseUncertainty(input) {
  const match = input.match(/^(.+)\[([^\[\]]+)\]$/);
  if (!match) {
    throw new Error(`Invalid decimal interval notation: ${input}`);
  }
  const shape = decimalShape(match[1]);
  const body = match[2].trim();
  const base = parseDecimalValue(shape.normalized);
  if (body.includes(",")) {
    throw new Error("Decimal interval notation requires ':' between bracketed values");
  }
  if (body.startsWith("+-") || body.startsWith("-+")) {
    const offsetText = body.slice(2).trim();
    if (offsetText.length === 0) {
      throw new Error("Symmetric notation must have a valid number after '+-' or '-+'");
    }
    const offset = scaledOffset(offsetText, shape.fractional.length, shape.hasPoint);
    return new RationalInterval(base.subtract(offset), base.add(offset));
  }
  const parts = body.split(/\s*:\s*/);
  if (parts.length > 2 || parts.length === 0 || parts.some((part) => part.length === 0)) {
    throw new Error("Decimal interval brackets require one or two colon-separated values");
  }
  const hasSignedPart = parts.some((part) => part.startsWith("+") || part.startsWith("-"));
  if (hasSignedPart) {
    let positive = null;
    let negative = null;
    for (const part of parts) {
      if (part.startsWith("+") && positive === null) {
        positive = part.slice(1);
      } else if (part.startsWith("-") && negative === null) {
        negative = part.slice(1);
      } else {
        throw new Error("Relative interval notation allows one '+' and one '-' offset");
      }
    }
    const positiveOffset = positive === null ? Rational.zero : scaledOffset(positive, shape.fractional.length, shape.hasPoint);
    const negativeOffset = negative === null ? Rational.zero : scaledOffset(negative, shape.fractional.length, shape.hasPoint);
    return new RationalInterval(base.subtract(negativeOffset), base.add(positiveOffset));
  }
  if (parts.length !== 2) {
    throw new Error("Compact interval notation requires exactly two endpoints");
  }
  const endpoint = (suffix) => {
    if (shape.hasPoint && shape.fractional.length === 0) {
      if (suffix.startsWith("#")) {
        return parseDecimalValue(`${shape.sign}${shape.integer}.${suffix}`);
      }
      const cleanSuffix2 = cleanDigits(suffix);
      return parseDecimalValue(`${shape.sign}${shape.integer}.${cleanSuffix2}`);
    }
    const cleanSuffix = cleanDigits(suffix);
    const point = shape.hasPoint ? "." : "";
    return parseDecimalValue(`${shape.sign}${shape.integer}${point}${shape.fractional}${cleanSuffix}`);
  };
  return new RationalInterval(endpoint(parts[0]), endpoint(parts[1]));
}
function parseApproximation(input) {
  let value = inputString(input, "certified approximation");
  const derived = value.match(/^(.+?)\?\[=([^:]+):([^:]+)\]$/);
  if (derived) {
    const candidate = parseRationalLiteral(derived[1]);
    let enclosure = new RationalInterval(parseRationalLiteral(derived[2]), parseRationalLiteral(derived[3]));
    if (!enclosure.containsValue(candidate) && candidate.lessThan(Rational.zero) && enclosure.low.greaterThanOrEqual(Rational.zero)) {
      enclosure = enclosure.negate();
    }
    return new CertifiedApproximation(candidate, enclosure, {
      representation: {
        kind: "derived",
        reason: "serialized",
        original: value
      }
    });
  }
  const explicitCf = value.startsWith("~");
  const cfValue = explicitCf ? value.slice(1) : value;
  const cf = cfValue.match(new RegExp(`^([+-]?${DIGITS})\\.~(${DIGITS}(?:~${DIGITS})*)\\?(${DIGITS}(?:~${DIGITS})*)?$`));
  if (cf) {
    const certified = [
      BigInt(cleanDigits(cf[1], { signed: true })),
      ...cf[2].split("~").map((term) => BigInt(cleanDigits(term)))
    ];
    const provisional2 = cf[3] ? cf[3].split("~").map((term) => BigInt(cleanDigits(term))) : [];
    return certifiedContinuedFractionPrefix({
      coefficients: certified,
      provisionalCoefficients: provisional2,
      original: value
    });
  }
  const match = value.match(/^(.+?)\?((?:\d(?:_?\d)*)?)(\[[^\[\]]+\])?$/);
  if (!match)
    throw new Error(`Invalid certified approximation notation: ${input}`);
  const shape = decimalShape(match[1]);
  const provisional = match[2] ? cleanDigits(match[2]) : "";
  const candidateText = shape.hasPoint ? `${shape.normalized}${provisional}` : `${shape.normalized}${provisional ? `.${provisional}` : ""}`;
  const explicitEnclosure = match[3] ? parseUncertainty(`${candidateText}${match[3]}`) : null;
  return certifiedRadixPrefix({
    integerDigits: shape.integer,
    fractionalDigits: shape.fractional,
    provisionalDigits: provisional,
    negative: shape.sign === "-",
    enclosure: explicitEnclosure,
    original: value
  });
}
function parseNumber(input) {
  const value = inputString(input);
  if (value.includes("?")) {
    return parseApproximation(value);
  }
  if (value.includes("[") || value.includes("]")) {
    return parseUncertainty(value);
  }
  const intervalParts = value.split(":");
  if (intervalParts.length === 2) {
    return new RationalInterval(parseRationalLiteral(intervalParts[0]), parseRationalLiteral(intervalParts[1]));
  }
  if (intervalParts.length > 2) {
    throw new Error("An interval must contain exactly two endpoints");
  }
  if (new RegExp(`^[+-]?${DIGITS}$`).test(value)) {
    return new Integer(BigInt(cleanDigits(value, { signed: true })));
  }
  return parseRationalLiteral(value);
}

// ../../rix/src/runtime/reactive-graph.js
var nextGraphId = 1;
var REACTIVE_READ_ENV = "__reactive_read__";
function method(name, impl) {
  return { type: "method_builtin", name, impl };
}
function text(value) {
  return value?.type === "string" ? value.value : typeof value === "string" ? value : null;
}
function nodeName(value, label = "Reactive node name", preserveCase = false) {
  const requested = text(value);
  const name = preserveCase ? requested : requested?.toLowerCase();
  const identifierPattern = preserveCase ? /^[A-Za-z_][A-Za-z0-9_]*$/u : /^[a-z_][a-z0-9_]*$/u;
  if (!name || !identifierPattern.test(name)) {
    throw new Error(`${label} must be a RiX identifier string`);
  }
  return name;
}
function graphMethods() {
  return new Map([
    ["SOURCE", method("Source", ([target, name, value]) => target.addSource(name, value))],
    ["DERIVE", method("Derive", ([target, name, formula]) => target.addComputed(name, formula))],
    ["GET", method("Get", ([target, name]) => target.get(name))],
    ["NODE", method("Node", ([target, name]) => target.node(name))],
    ["TOUCH", method("Touch", ([target, name]) => target.touch(name))],
    ["RECALCULATE", method("Recalculate", ([target]) => target.recalculate())],
    ["_mutable", new Integer(1n)]
  ]);
}
function nodeMethods() {
  return new Map([
    ["GET", method("Get", ([target]) => target.get())],
    ["PEEK", method("Peek", ([target]) => target.peek())],
    ["SET", method("Set", ([target, value]) => target.set(value))],
    ["REPLACEVALUE", method("ReplaceValue", ([target, value]) => target.replaceValue(value))],
    ["TOUCH", method("Touch", ([target]) => target.touch())],
    ["GETFORMULA", method("GetFormula", ([target]) => target.formula)],
    ["SETFORMULA", method("SetFormula", ([target, formula]) => target.setFormula(formula))],
    ["LIVE", method("Live", ([target]) => target.live())],
    ["_mutable", new Integer(1n)]
  ]);
}
function publicLive(node) {
  return Object.freeze({
    kind: node.kind,
    name: node.name,
    state: node.state,
    dependencies: Object.freeze([...node.dependencies]),
    dependents: Object.freeze([...node.dependents]),
    epoch: node.graph.epoch
  });
}
function isReactiveGraph(value) {
  return Boolean(value && value.type === "reactive_graph" && typeof value.get === "function");
}
function isReactiveNode(value) {
  return Boolean(value && value.type === "reactive_node" && isReactiveGraph(value.graph));
}
function isPromiseLike(value) {
  return value !== null && (typeof value === "object" || typeof value === "function") && typeof value.then === "function";
}
function assertSynchronousFormulaValue(value, seen = new WeakSet) {
  if (isPromiseLike(value)) {
    if (typeof value.catch === "function")
      value.catch(() => {});
    throw new Error("Reactive formulas cannot suspend; resolve async work before publishing a literal value");
  }
  if (value === null || typeof value !== "object" && typeof value !== "function")
    return;
  if (seen.has(value))
    return;
  seen.add(value);
  if (value instanceof Map) {
    for (const [key2, entry] of value) {
      assertSynchronousFormulaValue(key2, seen);
      assertSynchronousFormulaValue(entry, seen);
    }
    return;
  }
  if (value instanceof Set) {
    for (const entry of value)
      assertSynchronousFormulaValue(entry, seen);
    return;
  }
  for (const key2 of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key2);
    if (descriptor && Object.hasOwn(descriptor, "value")) {
      assertSynchronousFormulaValue(descriptor.value, seen);
    }
  }
}
function createReactiveGraph(options = {}) {
  if (typeof options.evaluateFormula !== "function") {
    throw new Error("ReactiveGraph requires a deferred formula evaluator");
  }
  const id = options.id || `reactive-graph-${nextGraphId++}`;
  const nodes = new Map;
  const aliases = new Map;
  const channel = new Set;
  const normalizeName = (value, label) => nodeName(value, label, options.preserveIdentifierCase === true);
  const reservedNames = new Set((options.reservedNames || []).map((name) => normalizeName(name)));
  let activeEpoch = null;
  let graph = null;
  function requireAvailableName(name) {
    if (reservedNames.has(name)) {
      throw new Error(`${options.reservedNameLabel || "Reactive node name is reserved"}: ${name}`);
    }
    if (nodes.has(name) || aliases.has(name))
      throw new Error(`Reactive node already exists: ${name}`);
  }
  function canonicalName(name) {
    name = normalizeName(name);
    return aliases.get(name) ?? name;
  }
  function requireNode(name) {
    const node = nodes.get(canonicalName(name));
    if (!node)
      throw new Error(`Unknown reactive node: ${name}`);
    return node;
  }
  function rebuildDependents() {
    for (const node of nodes.values())
      node.dependents = new Set;
    for (const node of nodes.values()) {
      for (const dependency of node.dependencies) {
        nodes.get(dependency)?.dependents.add(node.name);
      }
    }
  }
  function dirtyClosure(startNames) {
    const dirty = new Set(startNames);
    const queue = [...startNames];
    while (queue.length) {
      const name = queue.shift();
      for (const dependent of requireNode(name).dependents) {
        if (dirty.has(dependent))
          continue;
        dirty.add(dependent);
        queue.push(dependent);
      }
    }
    return dirty;
  }
  function makeNode(name, kind, fields) {
    const nodeChannel = new Set;
    const node = {
      type: "reactive_node",
      graph,
      graphId: id,
      name,
      id: `${id}:${name}`,
      kind,
      formula: fields.formula ?? null,
      source: fields.source ?? null,
      value: fields.value ?? null,
      lastGoodValue: fields.value ?? null,
      state: kind === "source" ? "clean" : "dirty",
      dependencies: new Set,
      dependents: new Set,
      diagnostics: [],
      evaluator: fields.evaluator ?? null,
      get() {
        return graph.get(name);
      },
      peek() {
        return graph.peek(name);
      },
      set(value, metadata = null) {
        if (kind !== "source")
          throw new Error(`Reactive computed node ${name} cannot be set directly`);
        return graph.setSource(name, value, metadata);
      },
      replaceValue(value, metadata = null) {
        return graph.replaceValue(name, value, metadata);
      },
      touch(metadata = null) {
        return graph.touch(name, metadata);
      },
      setFormula(formula, metadata = null) {
        if (kind !== "computed")
          throw new Error(`Reactive source node ${name} has no formula`);
        return graph.setFormula(name, formula, metadata);
      },
      live() {
        return publicLive(node);
      },
      subscribe(listener) {
        if (typeof listener !== "function")
          throw new Error("Reactive node subscriber must be a function");
        nodeChannel.add(listener);
        return () => nodeChannel.delete(listener);
      },
      _publish(event) {
        for (const listener of [...nodeChannel])
          listener(event);
      },
      _ext: nodeMethods(),
      toString() {
        if (node.value && ["function", "lambda", "multifunction"].includes(node.value.type)) {
          return `[Reactive function ${name}]`;
        }
        return `[Reactive ${kind} ${name}]`;
      }
    };
    return node;
  }
  function runEpoch({ dirty, sourceOverrides = new Map, cause = null, evaluateAll = false, forcePublish = new Set, preserveValues = new Set } = {}) {
    if (activeEpoch) {
      throw new Error(options.nestedEpochError || "Reactive computations cannot start a nested graph epoch");
    }
    const requested = evaluateAll ? new Set(nodes.keys()) : dirtyClosure(new Set([...dirty || [], ...sourceOverrides.keys()].map(canonicalName)));
    const previousEpoch = graph.epoch;
    const stagedValues = new Map([...nodes].map(([name, node]) => [name, node.value]));
    for (const [name, value] of sourceOverrides)
      stagedValues.set(name, value);
    const states = new Map([...nodes].map(([name, node]) => [
      name,
      requested.has(name) && node.kind === "computed" && !preserveValues.has(name) ? "dirty" : "clean"
    ]));
    const dependencies = new Map([...nodes].map(([name, node]) => [
      name,
      requested.has(name) && node.kind === "computed" && !preserveValues.has(name) ? new Set : new Set(node.dependencies)
    ]));
    const stack = [];
    let currentName = null;
    const epoch = {
      read(name) {
        name = canonicalName(name);
        const node = requireNode(name);
        if (!states.has(name)) {
          requested.add(name);
          stagedValues.set(name, node.value);
          states.set(name, node.kind === "computed" ? "dirty" : "clean");
          dependencies.set(name, new Set(node.dependencies));
        }
        if (currentName && currentName !== name)
          dependencies.get(currentName).add(name);
        if (node.kind === "source")
          return stagedValues.get(name);
        if (states.get(name) === "clean")
          return stagedValues.get(name);
        if (states.get(name) === "evaluating") {
          const cycleStart = stack.indexOf(name);
          const cycle = [...stack.slice(cycleStart), name].map((item) => options.labelForNode?.(item) ?? item);
          throw new Error(`${options.cycleLabel || "Reactive cycle"}: ${cycle.join(" -> ")}`);
        }
        states.set(name, "evaluating");
        stack.push(name);
        const previousName = currentName;
        currentName = name;
        try {
          const value = node.evaluator ? node.evaluator(node.formula, graph) : options.evaluateFormula(node.formula, graph);
          assertSynchronousFormulaValue(value);
          stagedValues.set(name, value);
          states.set(name, "clean");
          return value;
        } finally {
          currentName = previousName;
          stack.pop();
        }
      },
      peek(name) {
        name = canonicalName(name);
        const previousName = currentName;
        currentName = null;
        try {
          return this.read(name);
        } finally {
          currentName = previousName;
        }
      }
    };
    activeEpoch = epoch;
    try {
      for (const name of requested)
        epoch.read(name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const [name, state] of states) {
        if (state !== "evaluating")
          continue;
        const node = nodes.get(name);
        node.state = "error";
        node.diagnostics = [message];
      }
      const event2 = Object.freeze({
        type: "reactive:error",
        graph,
        epoch: graph.epoch,
        cause,
        error
      });
      for (const listener of [...channel])
        listener(event2);
      throw error;
    } finally {
      activeEpoch = null;
    }
    graph.epoch += 1;
    const changed = [];
    for (const name of requested) {
      const node = nodes.get(name);
      const previous = node.value;
      node.value = stagedValues.get(name);
      node.lastGoodValue = node.value;
      node.state = "clean";
      node.dependencies = node.kind === "computed" ? dependencies.get(name) : new Set;
      node.diagnostics = [];
      if (previous !== node.value)
        changed.push(name);
    }
    rebuildDependents();
    const event = Object.freeze({
      type: "reactive:commit",
      graph,
      previousEpoch,
      epoch: graph.epoch,
      changed: Object.freeze(changed),
      touched: Object.freeze([...forcePublish]),
      cause
    });
    for (const name of new Set([...changed, ...forcePublish]))
      nodes.get(name)._publish(event);
    for (const listener of [...channel])
      listener(event);
    return graph;
  }
  graph = {
    type: "reactive_graph",
    id,
    epoch: 0,
    get evaluating() {
      return activeEpoch !== null;
    },
    get nodeCount() {
      return nodes.size;
    },
    _ext: graphMethods(),
    addSource(name, value) {
      name = normalizeName(name);
      requireAvailableName(name);
      const node = makeNode(name, "source", { value });
      nodes.set(name, node);
      return node;
    },
    addComputed(name, formula, metadata = null) {
      name = normalizeName(name);
      requireAvailableName(name);
      if (!formula || formula.fn !== "DEFER") {
        throw new Error("ReactiveGraph.Derive requires deferred syntax @{ ... }");
      }
      const node = makeNode(name, "computed", {
        formula,
        source: metadata?.source ?? options.formulaSource?.(formula) ?? null,
        evaluator: metadata?.evaluator ?? null
      });
      nodes.set(name, node);
      if (metadata?.initialize === false)
        return node;
      try {
        runEpoch({ dirty: new Set([name]), cause: { type: "reactive:add", name } });
      } catch (error) {
        nodes.delete(name);
        rebuildDependents();
        throw error;
      }
      return node;
    },
    get(name) {
      name = normalizeName(name);
      if (activeEpoch)
        return activeEpoch.read(name);
      const node = requireNode(name);
      if (node.state === "error") {
        throw new Error(node.diagnostics[0] || `Reactive node ${name} has an error`);
      }
      return node.value;
    },
    has(name) {
      try {
        return nodes.has(canonicalName(name));
      } catch {
        return false;
      }
    },
    peek(name) {
      name = normalizeName(name);
      if (activeEpoch)
        return activeEpoch.peek(name);
      return requireNode(name).value;
    },
    node(name) {
      return requireNode(normalizeName(name));
    },
    bindings() {
      return new Map([
        ...nodes,
        ...[...aliases].map(([alias, canonical]) => [alias, nodes.get(canonical)])
      ]);
    },
    addAlias(name, target) {
      name = normalizeName(name);
      requireAvailableName(name);
      const node = isReactiveNode(target) ? target : requireNode(target);
      if (node.graph !== graph) {
        throw new Error("Reactive aliases must refer to a node in the same ReactiveGraph");
      }
      aliases.set(name, node.name);
      return node;
    },
    define(definitions, cause = null) {
      if (!Array.isArray(definitions) || definitions.length === 0)
        return graph;
      const pendingNames = new Set;
      for (const definition of definitions) {
        const name = normalizeName(definition?.name);
        requireAvailableName(name);
        if (pendingNames.has(name))
          throw new Error(`Reactive node already exists in definition batch: ${name}`);
        if (definition.kind !== "source" && definition.kind !== "computed") {
          throw new Error(`Reactive definition ${name} must be a source or computed node`);
        }
        if (definition.kind === "computed" && (!definition.formula || definition.formula.fn !== "DEFER")) {
          throw new Error(`Reactive computed definition ${name} requires deferred syntax @{ ... }`);
        }
        pendingNames.add(name);
      }
      const added = [];
      try {
        for (const definition of definitions) {
          const name = normalizeName(definition.name);
          const node = makeNode(name, definition.kind, definition.kind === "source" ? { value: definition.value } : {
            formula: definition.formula,
            source: definition.source ?? options.formulaSource?.(definition.formula) ?? null,
            evaluator: definition.evaluator ?? null
          });
          nodes.set(name, node);
          added.push(name);
        }
        const computed = new Set(added.filter((name) => nodes.get(name).kind === "computed"));
        if (computed.size > 0) {
          runEpoch({
            dirty: computed,
            cause: cause || { type: "reactive:define", names: Object.freeze([...added]) }
          });
        }
        return graph;
      } catch (error) {
        for (const name of added)
          nodes.delete(name);
        rebuildDependents();
        throw error;
      }
    },
    applyBatch(changes, cause = null) {
      if (!Array.isArray(changes) || changes.length === 0)
        return graph;
      const declarations = [];
      const aliasChanges = [];
      const updates = new Map;
      const pendingNames = new Set;
      for (const change of changes) {
        const name = normalizeName(change?.name);
        if (change.kind === "computed") {
          requireAvailableName(name);
          if (pendingNames.has(name)) {
            throw new Error(`Reactive node already exists in transaction: ${name}`);
          }
          if (!change.formula || change.formula.fn !== "DEFER") {
            throw new Error(`Reactive declaration ${name} requires a deferred definition`);
          }
          pendingNames.add(name);
          declarations.push({ ...change, name });
          continue;
        }
        if (change.kind === "alias") {
          requireAvailableName(name);
          if (pendingNames.has(name)) {
            throw new Error(`Reactive node already exists in transaction: ${name}`);
          }
          pendingNames.add(name);
          aliasChanges.push({ name, target: normalizeName(change.target) });
          continue;
        }
        if (change.kind === "update") {
          const target = requireNode(name);
          if (target.kind !== "computed") {
            throw new Error(`Reactive node ${name} does not have a replaceable definition`);
          }
          if (!change.formula || change.formula.fn !== "DEFER") {
            throw new Error(`Reactive update ${name} requires a deferred definition`);
          }
          updates.set(target.name, { ...change, name: target.name });
          continue;
        }
        throw new Error(`Unknown reactive transaction change: ${change?.kind}`);
      }
      const futureNames = new Set([...nodes.keys(), ...declarations.map(({ name }) => name)]);
      const futureAliases = new Map(aliases);
      for (const { name, target } of aliasChanges) {
        const canonical = futureAliases.get(target) ?? target;
        if (!futureNames.has(canonical)) {
          throw new Error(`Unknown reactive alias target: ${target}`);
        }
        futureAliases.set(name, canonical);
      }
      const addedNodes = [];
      const addedAliases = [];
      const previous = new Map;
      try {
        for (const definition of declarations) {
          const node = makeNode(definition.name, "computed", {
            formula: definition.formula,
            source: definition.source ?? options.formulaSource?.(definition.formula) ?? null,
            evaluator: definition.evaluator ?? null
          });
          nodes.set(definition.name, node);
          addedNodes.push(definition.name);
        }
        for (const { name } of aliasChanges) {
          aliases.set(name, futureAliases.get(name));
          addedAliases.push(name);
        }
        for (const [name, update] of updates) {
          const node = nodes.get(name);
          previous.set(name, {
            formula: node.formula,
            source: node.source,
            evaluator: node.evaluator,
            state: node.state,
            diagnostics: [...node.diagnostics],
            dependencies: new Set(node.dependencies)
          });
          node.formula = update.formula;
          node.source = update.source ?? options.formulaSource?.(update.formula) ?? null;
          node.evaluator = update.evaluator ?? node.evaluator;
        }
        const dirty = new Set([...addedNodes, ...updates.keys()]);
        if (dirty.size > 0) {
          runEpoch({
            dirty,
            cause: cause || {
              type: "reactive:batch",
              names: Object.freeze([...pendingNames, ...updates.keys()])
            }
          });
        }
        return graph;
      } catch (error) {
        for (const name of addedAliases)
          aliases.delete(name);
        for (const name of addedNodes)
          nodes.delete(name);
        for (const [name, snapshot] of previous) {
          const node = nodes.get(name);
          node.formula = snapshot.formula;
          node.source = snapshot.source;
          node.evaluator = snapshot.evaluator;
          node.state = snapshot.state;
          node.diagnostics = snapshot.diagnostics;
          node.dependencies = snapshot.dependencies;
        }
        rebuildDependents();
        throw error;
      }
    },
    replaceValues(entries, metadata = null) {
      if (activeEpoch)
        throw new Error("Reactive computations cannot publish worker results during an epoch");
      if (!Array.isArray(entries) || entries.length > 1e4)
        throw new Error("Invalid reactive literal batch");
      const updates = new Map;
      for (const entry of entries) {
        const node = requireNode(canonicalName(entry.name));
        assertSynchronousFormulaValue(entry.value);
        if (updates.has(node.name))
          throw new Error(`Duplicate reactive literal target: ${node.name}`);
        updates.set(node.name, { node, value: entry.value });
      }
      const previous = new Map, sources = new Map;
      try {
        for (const [name, { node, value }] of updates) {
          if (node.kind === "source")
            sources.set(name, value);
          else {
            previous.set(name, { formula: node.formula, source: node.source, evaluator: node.evaluator });
            node.formula = Object.freeze({ fn: "DEFER", args: Object.freeze([value]) });
            node.source = null;
            node.evaluator = () => value;
          }
        }
        if (updates.size)
          runEpoch({ dirty: new Set(updates.keys()), sourceOverrides: sources, cause: { type: "reactive:worker-batch", metadata } });
      } catch (error) {
        for (const [name, snapshot] of previous)
          Object.assign(requireNode(name), snapshot);
        throw error;
      }
      return graph;
    },
    setSource(name, value, metadata = null) {
      name = canonicalName(name);
      const node = requireNode(name);
      if (node.kind !== "source")
        throw new Error(`Reactive node ${name} is not a source`);
      runEpoch({
        dirty: new Set([name]),
        sourceOverrides: new Map([[name, value]]),
        cause: { type: "reactive:set", name, metadata }
      });
      return value;
    },
    replaceValue(name, value, metadata = null) {
      name = canonicalName(name);
      const node = requireNode(name);
      if (node.kind === "source")
        return graph.setSource(name, value, metadata);
      if (activeEpoch) {
        throw new Error(options.formulaMutationError || "Reactive computations cannot change formulas during an epoch");
      }
      const formula = Object.freeze({
        fn: "DEFER",
        args: Object.freeze([value])
      });
      graph.setFormula(name, formula, {
        ...metadata,
        source: metadata?.source ?? null
      });
      return value;
    },
    touch(name, metadata = null) {
      name = canonicalName(name);
      const node = requireNode(name);
      runEpoch({
        dirty: new Set([name]),
        forcePublish: new Set([node.name]),
        preserveValues: new Set([node.name]),
        cause: { type: "reactive:touch", name: node.name, metadata }
      });
      return node.value;
    },
    setFormula(name, formula, metadata = null) {
      name = canonicalName(name);
      const node = requireNode(name);
      if (node.kind !== "computed")
        throw new Error(`Reactive node ${name} is not computed`);
      if (activeEpoch) {
        throw new Error(options.formulaMutationError || "Reactive computations cannot change formulas during an epoch");
      }
      if (!formula || formula.fn !== "DEFER") {
        throw new Error("Reactive computed formulas require deferred syntax @{ ... }");
      }
      const previousFormula = node.formula;
      const previousSource = node.source;
      node.formula = formula;
      node.source = metadata?.source ?? options.formulaSource?.(formula) ?? null;
      if (metadata?.evaluator)
        node.evaluator = metadata.evaluator;
      try {
        runEpoch({
          dirty: new Set([name]),
          cause: {
            type: "reactive:formula",
            name,
            formula,
            source: node.source,
            previousFormula,
            previousSource,
            metadata
          }
        });
      } catch (error) {
        node.state = "error";
        throw error;
      }
      return node;
    },
    recalculate(cause = null) {
      return runEpoch({ evaluateAll: true, cause: cause || { type: "reactive:recalculate" } });
    },
    subscribe(listener) {
      if (typeof listener !== "function")
        throw new Error("ReactiveGraph subscriber must be a function");
      channel.add(listener);
      return () => channel.delete(listener);
    },
    toString() {
      return `[ReactiveGraph ${id} · ${nodes.size} nodes · epoch ${graph.epoch}]`;
    }
  };
  return graph;
}

// ../../rix/src/runtime/hole.js
var HOLE = Object.freeze({ __rix_hole__: true });
var isHole = (v) => v === HOLE;

// ../../rix/src/runtime/shaped.js
function domainKey(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("en-US");
}
function scalarDomainName(value) {
  if (value instanceof Integer)
    return "Integer";
  if (value instanceof Rational)
    return "Rational";
  if (value instanceof RationalInterval)
    return "RationalInterval";
  const semantic = value?._ext instanceof Map ? value._ext.get("__type")?.value : null;
  if (semantic)
    return semantic;
  if (value?.type)
    return value.type;
  if (typeof value === "bigint" || Number.isSafeInteger(value))
    return "Integer";
  return value?.constructor?.name ?? typeof value;
}
function mergeDomains(left, right) {
  if (!left)
    return right;
  if (!right || domainKey(left) === domainKey(right))
    return left;
  const pair = new Set([domainKey(left), domainKey(right)]);
  if ([...pair].every((name) => name === "integer" || name === "rational"))
    return "Rational";
  if ([...pair].every((name) => ["integer", "rational", "rationalinterval", "interval"].includes(name))) {
    return "RationalInterval";
  }
  throw new Error(`Shaped entries span incompatible scalar domains ${left} and ${right}; convert them explicitly`);
}
function inferShapedScalarDomain(values) {
  let domain = null;
  for (const value of values || []) {
    if (isHole(value))
      continue;
    domain = mergeDomains(domain, scalarDomainName(value));
  }
  return domain ?? "Unspecified";
}
function shapedScalarDomain(value) {
  return value?._ext instanceof Map ? value._ext.get("scalarDomain")?.value ?? value._ext.get("scalardomain")?.value ?? "Unspecified" : "Unspecified";
}
function valueBelongsToScalarDomain(value, domain) {
  if (isHole(value) || domainKey(domain) === "unspecified")
    return true;
  const source = domainKey(scalarDomainName(value));
  const target = domainKey(domain);
  if (source === target)
    return true;
  if (target === "rational" && source === "integer")
    return true;
  if (["rationalinterval", "interval"].includes(target) && ["integer", "rational"].includes(source))
    return true;
  return false;
}
function setScalarDomain(ext, domain) {
  const label = { type: "string", value: domain };
  ext.set("scalarDomain", label);
  ext.set("scalardomain", label);
}
function validateShapedScalarDomain(value, requestedDomain = null) {
  if (!isShaped(value))
    throw new Error("Scalar-domain validation expects a Shaped value");
  const declared = requestedDomain ?? shapedScalarDomain(value);
  const actual = domainKey(declared) === "unspecified" ? inferShapedScalarDomain(value.data) : declared;
  for (const entry of value.data) {
    if (!valueBelongsToScalarDomain(entry, actual)) {
      throw new Error(`Shaped entry from scalar domain ${scalarDomainName(entry)} does not satisfy declared domain ${actual}`);
    }
  }
  setScalarDomain(value._ext, actual);
  return value;
}
function exactInteger2(value, label = "Index") {
  if (value instanceof Integer) {
    return Number(value.value);
  }
  if (value instanceof Rational) {
    if (value.denominator !== 1n) {
      throw new Error(`${label} must be an integer`);
    }
    return Number(value.numerator);
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new Error(`${label} must be an integer`);
    }
    return value;
  }
  if (value && typeof value === "object") {
    if (typeof value.value === "bigint") {
      return Number(value.value);
    }
    if (typeof value.numerator === "bigint" && typeof value.denominator === "bigint") {
      if (value.denominator !== 1n) {
        throw new Error(`${label} must be an integer`);
      }
      return Number(value.numerator);
    }
  }
  throw new Error(`${label} must be an integer`);
}
function normalizeIndex(rawIndex, dimLength, axis) {
  const index = exactInteger2(rawIndex, `Index for axis ${axis + 1}`);
  if (index === 0) {
    throw new Error(`Shaped index 0 is invalid on axis ${axis + 1}`);
  }
  const normalized = index < 0 ? dimLength + 1 + index : index;
  if (normalized < 1 || normalized > dimLength) {
    throw new Error(`Shaped index ${index} is out of range for axis ${axis + 1} with length ${dimLength}`);
  }
  return normalized;
}
function intervalEndpoints(value) {
  if (value instanceof RationalInterval) {
    return [value.start, value.end];
  }
  if (value && value.type === "interval") {
    return [value.lo, value.hi];
  }
  return null;
}
function valueToSelectorSpec(value) {
  const endpoints = intervalEndpoints(value);
  if (endpoints) {
    return {
      kind: "slice",
      start: endpoints[0],
      end: endpoints[1]
    };
  }
  return {
    kind: "index",
    value
  };
}
function isShaped(value) {
  return !!value && value.type === "shaped" && Array.isArray(value.data) && Array.isArray(value.shape) && Array.isArray(value.strides);
}
function shapedRank(shaped) {
  return shaped.shape.length;
}
function shapedShape(shaped) {
  return [...shaped.shape];
}
function shapedSize(shaped) {
  return shaped.shape.reduce((product, dim) => product * dim, 1);
}
function computeDefaultStrides(shape) {
  const strides = new Array(shape.length);
  let stride = 1;
  for (let i = shape.length - 1;i >= 0; i--) {
    strides[i] = stride;
    stride *= shape[i];
  }
  return strides;
}
function createShaped(shape, data = null, options = {}) {
  if (!Array.isArray(shape)) {
    throw new Error("Shaped shape must be an array");
  }
  const normalizedShape = shape.map((dim, axis) => {
    const n = exactInteger2(dim, `Shaped shape axis ${axis + 1}`);
    if (n < 0) {
      throw new Error(`Shaped shape axis ${axis + 1} must be nonnegative`);
    }
    return n;
  });
  const size = normalizedShape.reduce((product, dim) => product * dim, 1);
  const actualData = data ? [...data] : new Array(size).fill(HOLE);
  if (actualData.length !== size) {
    throw new Error(`Shaped literal element count mismatch (expected ${size}, got ${actualData.length})`);
  }
  const ext = options.ext ?? new Map([["_mutable", new Integer(1n)]]);
  const result = {
    type: "shaped",
    data: actualData,
    shape: normalizedShape,
    strides: options.strides ? [...options.strides] : computeDefaultStrides(normalizedShape),
    offset: options.offset ?? 0,
    _ext: ext
  };
  const scalarDomain = options.scalarDomain ?? inferShapedScalarDomain(actualData);
  setScalarDomain(ext, scalarDomain);
  return validateShapedScalarDomain(result, scalarDomain);
}
function createShapedView(shaped, view) {
  if (!isShaped(shaped)) {
    throw new Error("Cannot create a shaped view from a non-shaped value");
  }
  const ext = new Map(shaped._ext instanceof Map ? shaped._ext : []);
  const semanticType = ext.get("__type")?.value?.toLowerCase?.();
  if (semanticType === "matrix" && view.shape.length !== 2) {
    ext.set("__type", { type: "string", value: "Shaped" });
    ext.delete("__proto");
  }
  return {
    type: "shaped",
    data: shaped.data,
    shape: [...view.shape],
    strides: [...view.strides],
    offset: view.offset,
    _ext: ext
  };
}
function shapedIndexTuple(indices) {
  return {
    type: "tuple",
    values: indices.map((index) => new Integer(BigInt(index)))
  };
}
function linearIndexToTuple(linearIndex, shape) {
  if (shape.length === 0) {
    return [];
  }
  const defaultStrides = computeDefaultStrides(shape);
  const tuple = new Array(shape.length);
  let remaining = linearIndex;
  for (let axis = 0;axis < shape.length; axis++) {
    const stride = defaultStrides[axis];
    const dim = shape[axis];
    if (dim === 0) {
      return [];
    }
    tuple[axis] = Math.floor(remaining / stride) + 1;
    remaining %= stride;
  }
  return tuple;
}
function shapedOffsetForTuple(shaped, tuple) {
  let offset = shaped.offset;
  for (let axis = 0;axis < shaped.shape.length; axis++) {
    offset += (tuple[axis] - 1) * shaped.strides[axis];
  }
  return offset;
}
function forEachShapedCell(shaped, callback) {
  const size = shapedSize(shaped);
  if (shaped.shape.length === 0) {
    callback(shaped.data[shaped.offset], [], shaped.offset);
    return;
  }
  for (let linear = 0;linear < size; linear++) {
    const tuple = linearIndexToTuple(linear, shaped.shape);
    const offset = shapedOffsetForTuple(shaped, tuple);
    callback(shaped.data[offset], tuple, offset);
  }
}
function normalizeShapedSelectors(shaped, selectorSpecs) {
  let specs = selectorSpecs;
  if (specs.length === 1 && specs[0]?.kind === "index" && specs[0].value && specs[0].value.type === "tuple") {
    specs = specs[0].value.values.map((value) => valueToSelectorSpec(value));
  }
  if (specs.length !== shaped.shape.length) {
    throw new Error(`Shaped rank mismatch: expected ${shaped.shape.length} indices, got ${specs.length}`);
  }
  return specs.map((spec, axis) => {
    if (spec.kind === "index") {
      const normalizedSpec = valueToSelectorSpec(spec.value);
      if (normalizedSpec.kind === "slice") {
        spec = normalizedSpec;
      }
    }
    if (spec.kind === "full") {
      const start = normalizeIndex(1, shaped.shape[axis], axis);
      const end = normalizeIndex(-1, shaped.shape[axis], axis);
      const direction = start <= end ? 1 : -1;
      return {
        kind: "slice",
        start,
        end,
        direction,
        length: Math.abs(end - start) + 1
      };
    }
    if (spec.kind === "slice") {
      const start = normalizeIndex(spec.start, shaped.shape[axis], axis);
      const end = normalizeIndex(spec.end, shaped.shape[axis], axis);
      const direction = start <= end ? 1 : -1;
      return {
        kind: "slice",
        start,
        end,
        direction,
        length: Math.abs(end - start) + 1
      };
    }
    return {
      kind: "index",
      index: normalizeIndex(spec.value, shaped.shape[axis], axis)
    };
  });
}
function shapedGetBySelectors(shaped, selectorSpecs) {
  const selectors = normalizeShapedSelectors(shaped, selectorSpecs);
  let offset = shaped.offset;
  const shape = [];
  const strides = [];
  for (let axis = 0;axis < selectors.length; axis++) {
    const selector = selectors[axis];
    const stride = shaped.strides[axis];
    if (selector.kind === "index") {
      offset += (selector.index - 1) * stride;
      continue;
    }
    offset += (selector.start - 1) * stride;
    shape.push(selector.length);
    strides.push(stride * selector.direction);
  }
  if (shape.length === 0) {
    const value = shaped.data[offset];
    return isHole(value) ? null : value;
  }
  return createShapedView(shaped, { shape, strides, offset });
}
function shapedAssignBySelectors(shaped, selectorSpecs, value) {
  const selectors = normalizeShapedSelectors(shaped, selectorSpecs);
  let offset = shaped.offset;
  const shape = [];
  const strides = [];
  for (let axis = 0;axis < selectors.length; axis++) {
    const selector = selectors[axis];
    const stride = shaped.strides[axis];
    if (selector.kind === "index") {
      offset += (selector.index - 1) * stride;
      continue;
    }
    offset += (selector.start - 1) * stride;
    shape.push(selector.length);
    strides.push(stride * selector.direction);
  }
  let declaredDomain = shapedScalarDomain(shaped);
  if (domainKey(declaredDomain) === "unspecified" && !isHole(value)) {
    declaredDomain = scalarDomainName(value);
    setScalarDomain(shaped._ext, declaredDomain);
  }
  if (!valueBelongsToScalarDomain(value, declaredDomain)) {
    throw new Error(`Shaped assignment from scalar domain ${scalarDomainName(value)} does not satisfy declared domain ${declaredDomain}`);
  }
  if (shape.length === 0) {
    shaped.data[offset] = value;
    return value;
  }
  const view = createShapedView(shaped, { shape, strides, offset });
  forEachShapedCell(view, (_cellValue, _tuple, cellOffset) => {
    shaped.data[cellOffset] = value;
  });
  return value;
}
function coerceShapeValue(shapeValue) {
  if (isShaped(shapeValue)) {
    return shapedShape(shapeValue);
  }
  if (shapeValue && shapeValue.type === "tuple") {
    return shapeValue.values.map((value, axis) => exactInteger2(value, `Shaped shape axis ${axis + 1}`));
  }
  throw new Error("Shaped.Generate expects a Shaped or tuple shape");
}

// ../../rix/src/runtime/sheet-labels.js
function text2(value) {
  return value?.type === "string" ? value.value : typeof value === "string" ? value : null;
}
function exactInteger3(value) {
  if (value instanceof Integer)
    return Number(value.value);
  if (value instanceof Rational && value.denominator === 1n)
    return Number(value.numerator);
  if (typeof value === "number" && Number.isInteger(value))
    return value;
  if (typeof value === "bigint")
    return Number(value);
  return null;
}
function entries(value, label) {
  if (value?.type === "map" && value.entries instanceof Map)
    return [...value.entries];
  if (value instanceof Map)
    return [...value];
  if (value && typeof value === "object" && !Array.isArray(value))
    return Object.entries(value);
  throw new Error(`${label} must be a map keyed by axis name`);
}
function axisIndexForKey(key2, axes, label) {
  const requested = text2(key2) ?? (typeof key2 === "string" ? key2 : null);
  if (requested === null)
    throw new Error(`${label} axis keys must be strings`);
  const exact2 = axes.map((name, index) => name === requested ? index : -1).filter((index) => index >= 0);
  if (exact2.length === 1)
    return exact2[0];
  if (exact2.length > 1)
    throw new Error(`${label} axis name is ambiguous: ${requested}`);
  const folded = requested.toLocaleLowerCase();
  const insensitive = axes.map((name, index) => name.toLocaleLowerCase() === folded ? index : -1).filter((index) => index >= 0);
  if (insensitive.length === 1)
    return insensitive[0];
  if (insensitive.length > 1)
    throw new Error(`${label} axis name is ambiguous: ${requested}`);
  throw new Error(`${label} has no axis named ${requested}`);
}
function coordinateForValue(value, axis, shape, axes, axisLabels, label) {
  const numeric = exactInteger3(value);
  if (numeric !== null) {
    if (numeric < 1 || numeric > shape[axis]) {
      throw new Error(`${label} coordinate ${numeric} is out of range for ${axes[axis]} (1..${shape[axis]})`);
    }
    return numeric;
  }
  const requested = text2(value);
  if (requested === null) {
    throw new Error(`${label} coordinate for ${axes[axis]} must be an integer or label string`);
  }
  const labels = axisLabels[axis];
  if (!labels)
    throw new Error(`${label} axis ${axes[axis]} has no coordinate labels`);
  const exact2 = labels.map((name, index) => name !== null && name === requested ? index + 1 : -1).filter((index) => index >= 1);
  if (exact2.length === 1)
    return exact2[0];
  if (exact2.length > 1) {
    throw new Error(`${label} coordinate label is ambiguous on ${axes[axis]}: ${requested}`);
  }
  const folded = requested.toLocaleLowerCase();
  const insensitive = labels.map((name, index) => typeof name === "string" && name.toLocaleLowerCase() === folded ? index + 1 : -1).filter((index) => index >= 1);
  if (insensitive.length === 1)
    return insensitive[0];
  if (insensitive.length > 1) {
    throw new Error(`${label} coordinate label is ambiguous on ${axes[axis]}: ${requested}`);
  }
  throw new Error(`${label} axis ${axes[axis]} has no coordinate labeled ${requested}`);
}
function labelSchema(shape, view = {}) {
  const field = (name) => {
    if (Object.hasOwn(view, name))
      return view[name];
    const canonical = name.toLocaleLowerCase();
    const match = Object.entries(view).find(([key2]) => key2.toLocaleLowerCase() === canonical);
    return match?.[1];
  };
  const requestedAxes = field("axes");
  const requestedLabels = field("axisLabels");
  const axes = Array.isArray(requestedAxes) && requestedAxes.length === shape.length ? [...requestedAxes] : shape.map((_length, index) => `axis${index + 1}`);
  const axisLabels = Array.isArray(requestedLabels) && requestedLabels.length === shape.length ? requestedLabels.map((labels) => labels === null ? null : [...labels]) : shape.map(() => null);
  return { axes, axisLabels };
}
function resolveLabeledCoordinate(shape, view, selector, label = "Sheet lookup") {
  const { axes, axisLabels } = labelSchema(shape, view);
  const coordinate = Array(shape.length).fill(null);
  for (const [key2, value] of entries(selector, label)) {
    const axis = axisIndexForKey(key2, axes, label);
    if (coordinate[axis] !== null) {
      throw new Error(`${label} repeats axis ${axes[axis]}`);
    }
    coordinate[axis] = coordinateForValue(value, axis, shape, axes, axisLabels, label);
  }
  const missing = coordinate.map((value, axis) => value === null ? axes[axis] : null).filter(Boolean);
  if (missing.length)
    throw new Error(`${label} is missing ${missing.join(", ")}`);
  return Object.freeze(coordinate);
}
function coordinateTuple(index) {
  return {
    type: "tuple",
    values: index.map((item) => new Integer(BigInt(item)))
  };
}

// ../../rix/src/runtime/formula-sheet.js
var nextFormulaSheetId = 1;
var FORMULA_SHEET_ASSIGNMENT_MODES = Object.freeze(["=", ":=", "~=", "::=", "~~="]);
var ASSIGNMENT_MODES = new Set(FORMULA_SHEET_ASSIGNMENT_MODES);
function text3(value, label) {
  const result = value?.type === "string" ? value.value : typeof value === "string" ? value : null;
  if (result === null)
    throw new Error(`${label} must be a string`);
  return result;
}
function assignmentMode(value = ":=") {
  const mode = text3(value, "FormulaSheet assignment mode");
  if (!ASSIGNMENT_MODES.has(mode)) {
    throw new Error(`Unsupported FormulaSheet assignment mode: ${mode}`);
  }
  return mode;
}
function formulaSourceParts(value, requestedMode = null) {
  const source = text3(value, "FormulaSheet formula source");
  const match = source.match(/^\s*(::=|~~=|:=|~=|=)\s*([\s\S]+)$/u);
  const explicitMode = match?.[1] ?? null;
  const body = match ? match[2] : source;
  if (body.trim().length === 0)
    throw new Error("FormulaSheet formula source must not be empty");
  const selectedMode = requestedMode === null || requestedMode === undefined ? explicitMode ?? ":=" : assignmentMode(requestedMode);
  if (explicitMode !== null && explicitMode !== selectedMode) {
    throw new Error(`FormulaSheet source begins with ${explicitMode}, but assignment mode is ${selectedMode}`);
  }
  return { source: body, assignmentMode: selectedMode };
}
function formulaSheetId(value) {
  const id = text3(value, "FormulaSheet id");
  if (id.trim().length === 0)
    throw new Error("FormulaSheet id must not be empty");
  return id;
}
function exactIndex(value, label = "Formula sheet index") {
  if (value instanceof Integer)
    return Number(value.value);
  if (value instanceof Rational && value.denominator === 1n)
    return Number(value.numerator);
  if (typeof value === "number" && Number.isInteger(value))
    return value;
  if (typeof value === "bigint")
    return Number(value);
  throw new Error(`${label} must be an integer`);
}
function valuesOf(value, label) {
  if (Array.isArray(value))
    return value;
  if (value && ["sequence", "tuple", "array"].includes(value.type)) {
    return value.values || value.elements || [];
  }
  throw new Error(`${label} must be an array, tuple, or sequence`);
}
function requireFormula(formula, index) {
  if (!formula || formula.fn !== "DEFER") {
    throw new Error(`FormulaSheet formula [${index.join(",")}] must use deferred syntax @{ ... }`);
  }
  return formula;
}
function normalizeFormulaGrid(value) {
  if (value?.type === "sparse_formula_grid") {
    if (!Array.isArray(value.shape) || value.shape.length === 0) {
      throw new Error("Sparse FormulaSheet requires a non-empty shape");
    }
    const shape = value.shape.map((length, axis) => {
      if (!Number.isSafeInteger(length) || length < 1) {
        throw new Error(`Sparse FormulaSheet axis ${axis + 1} must have a positive safe length`);
      }
      return length;
    });
    const entries3 = [...value.entries ?? []].map(({ index, formula }) => ({
      index: Object.freeze(normalizeIndex2(index, shape)),
      formula: requireFormula(formula, index)
    }));
    const keys = new Set;
    for (const { index } of entries3) {
      const key2 = slotKey(index);
      if (keys.has(key2))
        throw new Error(`Sparse FormulaSheet repeats grid[${key2}]`);
      keys.add(key2);
    }
    return {
      shape,
      entries: entries3,
      defaultFormula: requireFormula(value.defaultFormula, Array(shape.length).fill(1))
    };
  }
  if (isShaped(value)) {
    const shape = [...value.shape];
    if (shape.length === 0 || shape.some((length) => length === 0)) {
      throw new Error("FormulaSheet requires a non-empty shaped of rank 1 or greater");
    }
    const entries3 = [];
    forEachShapedCell(value, (formula, index) => {
      entries3.push({
        index: Object.freeze([...index]),
        formula: requireFormula(formula, index)
      });
    });
    return { shape, entries: entries3, defaultFormula: null };
  }
  const rows = valuesOf(value, "FormulaSheet formulas");
  if (rows.length === 0)
    throw new Error("FormulaSheet requires at least one row");
  const matrix = rows.map((row, index) => valuesOf(row, `FormulaSheet row ${index + 1}`));
  const columns = matrix[0].length;
  if (columns === 0)
    throw new Error("FormulaSheet requires at least one column");
  if (!matrix.every((row) => row.length === columns)) {
    throw new Error("FormulaSheet rows must have equal lengths");
  }
  const entries2 = [];
  for (const [rowIndex, row] of matrix.entries()) {
    for (const [columnIndex, formula] of row.entries()) {
      const index = Object.freeze([rowIndex + 1, columnIndex + 1]);
      entries2.push({ index, formula: requireFormula(formula, index) });
    }
  }
  return { shape: [matrix.length, columns], entries: entries2, defaultFormula: null };
}
function nodeNameFor(index) {
  return `slot_${index.join("_")}`;
}
function keyFromNodeName(name) {
  return String(name).replace(/^slot_/, "").replaceAll("_", ",");
}
function addressFor(index) {
  return `grid[${index.join(",")}]`;
}
function slotKey(index) {
  return index.join(",");
}
function slotIdFor(sheetId, index) {
  return `${sheetId}:slot:${index.join(":")}`;
}
function visitLogicalIndices(shape, visitor, axis = 0, index = []) {
  if (axis === shape.length) {
    visitor(Object.freeze([...index]));
    return;
  }
  for (let coordinate = 1;coordinate <= shape[axis]; coordinate += 1) {
    visitLogicalIndices(shape, visitor, axis + 1, [...index, coordinate]);
  }
}
function normalizeIndex2(index, shape) {
  const values = Array.isArray(index) ? index : index?.type === "tuple" || index?.type === "sequence" ? index.values : [index];
  if (values.length !== shape.length) {
    throw new Error(`FormulaSheet rank mismatch: expected ${shape.length} indices, got ${values.length}`);
  }
  return values.map((value, axis) => {
    const integer = exactIndex(value, `FormulaSheet axis ${axis + 1} index`);
    if (integer < 1 || integer > shape[axis]) {
      throw new Error(`FormulaSheet index ${integer} is out of range on axis ${axis + 1}`);
    }
    return integer;
  });
}
function method2(name, impl) {
  return { type: "method_builtin", name, impl };
}
function formulaSheetMethods() {
  return new Map([
    ["SETREGION", method2("SetRegion", ([target, name, start, end]) => target.setRegion(name, start, end))],
    ["FORMATREGION", method2("FormatRegion", ([target, start, end, style]) => target.formatRegion(start, end, style))],
    ["INSERTAXIS", method2("InsertAxis", ([target, axis, coordinate, count = new Integer(1n)]) => target.insertAxis(axis, coordinate, count))],
    ["GETFORMULA", method2("GetFormula", ([target, ...index]) => target.getFormula(index))],
    ["SETFORMULA", method2("SetFormula", ([target, ...args]) => {
      if (args.length < 2)
        throw new Error("FormulaSheet.SetFormula requires indices and a deferred formula");
      const formula = args.at(-1);
      return target.setFormula(args.slice(0, -1), formula);
    })],
    ["GETSOURCE", method2("GetSource", ([target, ...index]) => target.getFormulaSource(index))],
    ["SETSOURCE", method2("SetSource", ([target, ...args]) => {
      const rank = target.rank;
      if (args.length !== rank + 1 && args.length !== rank + 2) {
        throw new Error(`FormulaSheet.SetSource expects ${rank} indices, source, and optional assignment mode`);
      }
      const index = args.slice(0, rank);
      const source = args[rank];
      const mode = args[rank + 1] ?? null;
      return target.setFormulaSource(index, source, mode);
    })],
    ["GETASSIGNMENTMODE", method2("GetAssignmentMode", ([target, ...index]) => target.slot(index).assignmentMode)],
    ["INDEX", method2("Index", ([target, selector]) => target.index(selector))],
    ["AT", method2("At", ([target, selector]) => target.at(selector))],
    ["SLOTAT", method2("SlotAt", ([target, selector]) => target.slotAt(selector))],
    ["NEAR", method2("Near", ([target, origin, offsets]) => target.near(origin, offsets))],
    ["SETAXISLABEL", method2("SetAxisLabel", ([target, axis, coordinate, label]) => target.setAxisLabel(axis, coordinate, label))],
    ["RECALCULATE", method2("Recalculate", ([target]) => target.recalculate())],
    ["SLOT", method2("Slot", ([target, ...index]) => target.slot(index))],
    ["GRAPH", method2("Graph", ([target]) => target.graph)],
    ["_mutable", new Integer(1n)]
  ]);
}
function publicSlot(slot, index, metadata) {
  const editDiagnostics = metadata.editDiagnostics ?? [];
  const diagnostics = editDiagnostics.length > 0 ? editDiagnostics : slot.diagnostics;
  const diagnosticKind = editDiagnostics.length > 0 ? metadata.diagnosticKind ?? "parse" : diagnostics.length > 0 ? diagnostics.some((message) => message.startsWith("Formula cycle:")) ? "cycle" : "runtime" : null;
  return Object.freeze({
    id: metadata.id,
    reactiveId: slot.id,
    index: Object.freeze([...index]),
    source: metadata.source,
    assignmentMode: metadata.assignmentMode,
    formula: slot.formula,
    value: slot.value,
    lastGoodValue: slot.lastGoodValue,
    state: diagnostics.length > 0 ? "error" : slot.state,
    dependencies: Object.freeze([...slot.dependencies].map(keyFromNodeName)),
    diagnostics: Object.freeze([...diagnostics]),
    diagnosticKind,
    diagnosticSource: metadata.diagnosticSource ?? null,
    view: metadata.view
  });
}
function isFormulaSheet(value) {
  return Boolean(value && value.type === "formula_sheet" && Array.isArray(value.shape));
}
function createFormulaSheet(formulasValue, options = {}) {
  const formulas = normalizeFormulaGrid(formulasValue);
  if (typeof options.runFormula !== "function") {
    throw new Error("FormulaSheet requires a deferred formula evaluator");
  }
  const shape = Object.freeze([...formulas.shape]);
  const id = options.id === null || options.id === undefined ? `formula-sheet-${nextFormulaSheetId++}` : formulaSheetId(options.id);
  const identityFor = (index) => options.slotIdentity ? options.slotIdentity(index) : slotIdFor(id, index);
  const defaultAssignmentMode = assignmentMode(options.assignmentMode ?? ":=");
  const providedSlotMetadata = options.slotMetadata instanceof Map ? options.slotMetadata : new Map;
  const defaultSlotMetadata = options.defaultSlotMetadata ?? {};
  const defaultSlotDefinition = Object.freeze({
    source: defaultSlotMetadata.source ?? (formulas.defaultFormula ? options.formulaSource?.(formulas.defaultFormula) : null) ?? "_",
    assignmentMode: assignmentMode(defaultSlotMetadata.assignmentMode ?? ":="),
    view: Object.freeze({ ...defaultSlotMetadata.view ?? {} })
  });
  const slotMetadata = new Map(formulas.entries.map(({ index, formula }) => {
    const provided = providedSlotMetadata.get(slotKey(index)) ?? {};
    const source = provided.source ?? options.formulaSource?.(formula) ?? null;
    const idForSlot = provided.id ?? identityFor(index);
    if (idForSlot !== identityFor(index)) {
      throw new Error(`FormulaSheet slot id must be ${identityFor(index)}`);
    }
    return [slotKey(index), {
      id: idForSlot,
      source,
      assignmentMode: assignmentMode(provided.assignmentMode ?? defaultAssignmentMode),
      view: Object.freeze({ ...provided.view ?? {} }),
      editDiagnostics: Object.freeze([]),
      diagnosticKind: null,
      diagnosticSource: null
    }];
  }));
  const materializedSlotKeys = new Set;
  const channel = new Set;
  let currentDocumentView = Object.freeze({ ...options.documentView ?? {} });
  const graph = createReactiveGraph({
    id: `${id}:graph`,
    preserveIdentifierCase: true,
    formulaSource: options.formulaSource,
    evaluateFormula(formula) {
      return options.runFormula(formula, Object.fromEntries([...graph.bindings(), ["grid", sheet]]), { reactiveGraph: graph });
    },
    cycleLabel: "Formula cycle",
    reservedNames: ["grid", "row", "col", "index", "near"],
    reservedNameLabel: "FormulaSheet graph node name is reserved",
    labelForNode(name) {
      return addressFor(keyFromNodeName(name).split(","));
    },
    formulaMutationError: "FormulaSheet formulas cannot change formulas during evaluation",
    nestedEpochError: "FormulaSheet formulas cannot start a nested recalculation"
  });
  const sheet = {
    type: "formula_sheet",
    id,
    shape,
    rank: shape.length,
    get documentView() {
      return currentDocumentView;
    },
    graph,
    defaultSlotDefinition,
    get epoch() {
      return graph.epoch;
    },
    _ext: formulaSheetMethods(),
    get(index) {
      const normalized = normalizeIndex2(index, shape);
      ensureSlot(normalized);
      return graph.get(nodeNameFor(normalized));
    },
    index(selector) {
      return coordinateTuple(resolveLabeledCoordinate(shape, sheet.documentView, selector, "FormulaSheet.Index"));
    },
    at(selector) {
      return sheet.get(resolveLabeledCoordinate(shape, sheet.documentView, selector, "FormulaSheet.At"));
    },
    near(origin, offsetsValue) {
      const normalizedOrigin = normalizeIndex2(origin, shape);
      const offsets = valuesOf(offsetsValue, "FormulaSheet.Near offsets");
      if (offsets.length !== shape.length) {
        throw new Error(`near expects ${shape.length} offsets, got ${offsets.length}`);
      }
      const target = offsets.map((offset, axis) => {
        const delta = exactIndex(offset, `near axis ${axis + 1} offset`);
        const coordinate = normalizedOrigin[axis] + delta;
        if (coordinate < 1 || coordinate > shape[axis]) {
          throw new Error(`near[${offsets.join(",")}] from ${addressFor(normalizedOrigin)} is out of range on axis ${axis + 1}`);
        }
        return coordinate;
      });
      return sheet.get(target);
    },
    slotAt(selector) {
      return sheet.slot(resolveLabeledCoordinate(shape, sheet.documentView, selector, "FormulaSheet.SlotAt"));
    },
    track() {
      visitLogicalIndices(shape, (index) => sheet.get(index));
      return sheet;
    },
    setRegion(name, start, end) {
      if (typeof options.editDocumentView !== "function")
        throw new Error("FormulaSheet region editing requires a document host");
      const bounds = start === null && end === null ? { start: null, end: null } : { start: valuesOf(start, "Region start").map((v) => exactIndex(v)), end: valuesOf(end, "Region end").map((v) => exactIndex(v)) };
      return options.editDocumentView(sheet, { type: "view:region", name: text3(name, "Region name"), ...bounds });
    },
    formatRegion(start, end, style) {
      if (typeof options.editDocumentView !== "function")
        throw new Error("FormulaSheet region editing requires a document host");
      return options.editDocumentView(sheet, { type: "view:format", start: valuesOf(start, "Region start").map((v) => exactIndex(v)), end: valuesOf(end, "Region end").map((v) => exactIndex(v)), style: JSON.parse(text3(style, "Region style JSON")) });
    },
    insertAxis(axis, coordinate, count = 1) {
      if (typeof options.insertAxis !== "function")
        throw new Error("FormulaSheet structural editing requires a document host");
      return options.insertAxis(sheet, exactIndex(axis), exactIndex(coordinate), exactIndex(count));
    },
    getFormula(index) {
      const normalized = normalizeIndex2(index, shape);
      ensureSlot(normalized);
      return graph.node(nodeNameFor(normalized)).formula;
    },
    getFormulaSource(index) {
      const normalized = normalizeIndex2(index, shape);
      ensureSlot(normalized);
      return slotMetadata.get(slotKey(normalized)).source;
    },
    reactiveNode(index) {
      const normalized = normalizeIndex2(index, shape);
      ensureSlot(normalized);
      return graph.node(nodeNameFor(normalized));
    },
    setFormula(index, formula, metadata = null) {
      if (!formula || formula.fn !== "DEFER") {
        throw new Error("FormulaSheet.SetFormula requires deferred syntax @{ ... }");
      }
      const normalized = normalizeIndex2(index, shape);
      ensureSlot(normalized);
      const record = slotMetadata.get(slotKey(normalized));
      const previousSource = record.source;
      const previousMode = record.assignmentMode;
      const nextSource = metadata?.source ?? options.formulaSource?.(formula) ?? null;
      const nextMode = assignmentMode(metadata?.assignmentMode ?? record.assignmentMode);
      const previousView = record.view;
      const previousEditDiagnostics = record.editDiagnostics;
      const previousDiagnosticKind = record.diagnosticKind;
      const previousDiagnosticSource = record.diagnosticSource;
      const nextView = record.view?.blank === true ? Object.freeze(Object.fromEntries(Object.entries(record.view).filter(([key2]) => key2 !== "blank"))) : record.view;
      record.source = nextSource;
      record.assignmentMode = nextMode;
      record.view = nextView;
      record.editDiagnostics = Object.freeze([]);
      record.diagnosticKind = null;
      record.diagnosticSource = null;
      try {
        graph.setFormula(nodeNameFor(normalized), formula, {
          ...metadata,
          source: nextSource,
          assignmentMode: nextMode,
          sheetCause: {
            type: "formula:set",
            index: Object.freeze(normalized),
            formula,
            assignmentMode: nextMode
          }
        });
      } catch (error) {
        if (graph.node(nodeNameFor(normalized)).formula !== formula) {
          record.source = previousSource;
          record.assignmentMode = previousMode;
          record.view = previousView;
          record.editDiagnostics = previousEditDiagnostics;
          record.diagnosticKind = previousDiagnosticKind;
          record.diagnosticSource = previousDiagnosticSource;
        }
        throw error;
      }
      return sheet;
    },
    setFormulaSource(index, source, mode = null) {
      if (typeof options.compileFormula !== "function") {
        throw new Error("FormulaSheet source editing requires a formula compiler");
      }
      const normalized = normalizeIndex2(index, shape);
      let parts = null;
      let formula;
      try {
        parts = formulaSourceParts(source, mode);
        formula = options.compileFormula(parts.source);
      } catch (error) {
        const record = slotMetadataFor(normalized);
        const message = error instanceof Error ? error.message : String(error);
        const attemptedSource = parts?.source ?? (source?.type === "string" ? source.value : String(source ?? ""));
        record.editDiagnostics = Object.freeze([message]);
        record.diagnosticKind = "parse";
        record.diagnosticSource = attemptedSource;
        const formulaEvent = Object.freeze({
          type: "formula:error",
          sheet,
          epoch: sheet.epoch,
          cause: Object.freeze({
            type: "formula:parse",
            index: Object.freeze(normalized),
            source: attemptedSource,
            assignmentMode: parts?.assignmentMode ?? null
          }),
          error
        });
        for (const listener of [...channel])
          listener(formulaEvent);
        throw error;
      }
      return sheet.setFormula(normalized, formula, {
        source: parts.source,
        assignmentMode: parts.assignmentMode,
        sourceKind: "formula-source"
      });
    },
    setFormulaSources(edits) {
      if (!Array.isArray(edits) || edits.length === 0) {
        throw new Error("FormulaSheet batch edit requires at least one edit");
      }
      if (typeof options.compileFormula !== "function") {
        throw new Error("FormulaSheet source editing requires a formula compiler");
      }
      const occupied = new Set;
      const prepared = edits.map((edit) => {
        const index = normalizeIndex2(edit?.index, shape);
        const key2 = slotKey(index);
        if (occupied.has(key2))
          throw new Error(`FormulaSheet batch repeats ${addressFor(index)}`);
        occupied.add(key2);
        const parts = formulaSourceParts(edit?.source, edit?.assignmentMode ?? null);
        return { index, key: key2, parts, formula: options.compileFormula(parts.source) };
      });
      for (const edit of prepared)
        ensureSlot(edit.index, false);
      const previous = new Map(prepared.map(({ key: key2 }) => {
        const record = slotMetadata.get(key2);
        return [key2, { ...record }];
      }));
      for (const { key: key2, parts } of prepared) {
        const record = slotMetadata.get(key2);
        record.source = parts.source;
        record.assignmentMode = parts.assignmentMode;
        record.view = record.view?.blank === true ? Object.freeze(Object.fromEntries(Object.entries(record.view).filter(([name]) => name !== "blank"))) : record.view;
        record.editDiagnostics = Object.freeze([]);
        record.diagnosticKind = null;
        record.diagnosticSource = null;
      }
      const publicEdits = Object.freeze(prepared.map(({ index, parts }) => Object.freeze({
        index: Object.freeze([...index]),
        source: parts.source,
        assignmentMode: parts.assignmentMode,
        view: slotMetadata.get(slotKey(index)).view
      })));
      try {
        graph.applyBatch(prepared.map(({ index, formula, parts }) => ({
          kind: "update",
          name: nodeNameFor(index),
          formula,
          source: parts.source
        })), { type: "formula:batch", edits: publicEdits });
      } catch (error) {
        for (const [key2, snapshot] of previous)
          Object.assign(slotMetadata.get(key2), snapshot);
        throw error;
      }
      return sheet;
    },
    setAxisLabel(axisValue, coordinateValue, labelValue) {
      const axis = exactIndex(axisValue, "FormulaSheet axis label axis");
      if (axis < 1 || axis > shape.length) {
        throw new Error(`FormulaSheet axis ${axis} is out of range`);
      }
      const coordinate = exactIndex(coordinateValue, `FormulaSheet axis ${axis} label coordinate`);
      if (coordinate < 1 || coordinate > shape[axis - 1]) {
        throw new Error(`FormulaSheet axis ${axis} label coordinate ${coordinate} is out of range`);
      }
      const label = labelValue === null || labelValue === undefined ? null : text3(labelValue, "FormulaSheet axis label").trim() || null;
      const schema = labelSchema(shape, currentDocumentView);
      const axisLabels = schema.axisLabels.map((labels, index) => labels === null ? Array(shape[index]).fill(null) : [...labels]);
      axisLabels[axis - 1] = axisLabels[axis - 1].map((entry, index) => index === coordinate - 1 ? label : entry);
      const normalizedLabels = axisLabels.map((labels) => labels.every((entry) => entry === null) ? null : Object.freeze(labels));
      const nextView = Object.fromEntries(Object.entries(currentDocumentView).filter(([key2]) => key2.toLocaleLowerCase() !== "axislabels"));
      currentDocumentView = Object.freeze({
        ...nextView,
        axisLabels: Object.freeze(normalizedLabels)
      });
      const event = Object.freeze({
        type: "formula:view",
        sheet,
        epoch: sheet.epoch,
        cause: Object.freeze({
          type: "view:axis-label",
          axis,
          coordinate,
          label
        })
      });
      for (const listener of [...channel])
        listener(event);
      return sheet;
    },
    slot(index) {
      const normalized = normalizeIndex2(index, shape);
      ensureSlot(normalized);
      return publicSlot(graph.node(nodeNameFor(normalized)), normalized, slotMetadata.get(slotKey(normalized)));
    },
    recalculate(cause = null) {
      graph.recalculate(cause || { type: "formula:recalculate" });
      return sheet;
    },
    subscribe(listener) {
      if (typeof listener !== "function")
        throw new Error("FormulaSheet subscriber must be a function");
      channel.add(listener);
      return () => channel.delete(listener);
    },
    get materializedSlotCount() {
      return materializedSlotKeys.size;
    },
    materializedSlots() {
      return Object.freeze([...materializedSlotKeys].map((key2) => {
        const index = Object.freeze(key2.split(",").map(Number));
        return sheet.slot(index);
      }));
    },
    toString() {
      return `[FormulaSheet ${shape.join("×")} · epoch ${sheet.epoch}]`;
    }
  };
  function slotMetadataFor(index) {
    const key2 = slotKey(index);
    let metadata = slotMetadata.get(key2);
    if (metadata)
      return metadata;
    const idForSlot = identityFor(index);
    metadata = {
      id: idForSlot,
      source: defaultSlotDefinition.source,
      assignmentMode: defaultSlotDefinition.assignmentMode,
      view: defaultSlotDefinition.view,
      editDiagnostics: Object.freeze([]),
      diagnosticKind: null,
      diagnosticSource: null
    };
    slotMetadata.set(key2, metadata);
    return metadata;
  }
  function addSlot(index, formula, initialize) {
    const key2 = slotKey(index);
    if (materializedSlotKeys.has(key2))
      return graph.node(nodeNameFor(index));
    const metadata = slotMetadataFor(index);
    materializedSlotKeys.add(key2);
    try {
      graph.addComputed(nodeNameFor(index), formula, {
        source: metadata.source,
        initialize,
        evaluator(slotFormula) {
          const near = Object.freeze({
            type: "formula_near",
            rank: shape.length,
            index,
            get(offsets) {
              return sheet.near(index, offsets);
            }
          });
          const contextualBindings = [
            ...graph.bindings(),
            ["grid", sheet],
            ["near", near],
            ["index", {
              type: "tuple",
              values: index.map((item) => new Integer(BigInt(item)))
            }]
          ];
          if (index[0] !== undefined) {
            contextualBindings.push(["row", new Integer(BigInt(index[0]))]);
          }
          if (index[1] !== undefined) {
            contextualBindings.push(["col", new Integer(BigInt(index[1]))]);
          }
          return options.runFormula(slotFormula, Object.fromEntries(contextualBindings), {
            reactiveGraph: graph
          });
        }
      });
    } catch (error) {
      materializedSlotKeys.delete(key2);
      throw error;
    }
    return graph.node(nodeNameFor(index));
  }
  function ensureSlot(index, initialize = !graph.evaluating) {
    const key2 = slotKey(index);
    if (materializedSlotKeys.has(key2))
      return graph.node(nodeNameFor(index));
    if (!formulas.defaultFormula) {
      throw new Error(`FormulaSheet slot ${addressFor(index)} is not defined`);
    }
    return addSlot(index, formulas.defaultFormula, initialize);
  }
  for (const { index, formula } of formulas.entries) {
    addSlot(index, formula, false);
  }
  graph.subscribe((event) => {
    const metadata = event.cause?.metadata;
    const sheetCause = metadata?.sheetCause ? Object.freeze({ ...metadata.sheetCause, source: metadata.source, metadata }) : event.cause;
    if (event.type === "reactive:error") {
      const formulaEvent2 = Object.freeze({
        type: "formula:error",
        sheet,
        epoch: sheet.epoch,
        cause: sheetCause,
        error: event.error
      });
      for (const listener of [...channel])
        listener(formulaEvent2);
      return;
    }
    const changed = Object.freeze(event.changed.filter((name) => name.startsWith("slot_")).map((name) => Object.freeze(keyFromNodeName(name).split(",").map(Number))));
    const formulaEvent = Object.freeze({
      type: "formula:commit",
      sheet,
      previousEpoch: event.previousEpoch,
      epoch: event.epoch,
      changed,
      reactiveChanged: event.changed,
      cause: sheetCause
    });
    for (const listener of [...channel])
      listener(formulaEvent);
  });
  graph.recalculate({ type: "formula:initial" });
  return sheet;
}

// ../../rix/src/parser/source-limits.js
var RIX_SOURCE_LIMITS = Object.freeze({
  sourceLength: 8 * 1024 * 1024,
  tokens: 262144,
  tokenLength: 1024 * 1024,
  numeralLength: 65536,
  nodes: 262144,
  parseDepth: 128,
  astDepth: 256,
  recoveryErrors: 32
});
function sourceLimits(options = {}) {
  const input = options.limits || {};
  const result = { ...RIX_SOURCE_LIMITS };
  for (const key2 of Object.keys(input)) {
    if (!Object.hasOwn(RIX_SOURCE_LIMITS, key2))
      throw new TypeError(`Unknown source limit '${key2}'`);
    if (!Number.isSafeInteger(input[key2]) || input[key2] < 1 || input[key2] > RIX_SOURCE_LIMITS[key2]) {
      throw new RangeError(`Source limit '${key2}' must be 1..${RIX_SOURCE_LIMITS[key2]}`);
    }
    result[key2] = input[key2];
  }
  return result;
}

class RixSourceLimitError extends Error {
  constructor(limit, maximum, offset = 0, endOffset = offset) {
    super(`Source limit '${limit}' exceeded (maximum ${maximum}) at position ${offset}`);
    this.name = "RixSourceLimitError";
    this.code = "RXP1001";
    this.reason = `Source limit '${limit}' exceeded (maximum ${maximum})`;
    this.limit = limit;
    this.maximum = maximum;
    this.offset = offset;
    this.endOffset = Math.max(offset, endOffset);
  }
}
function checkSourceLimit(limit, value, limits, offset = 0, endOffset = offset) {
  if (value > limits[limit])
    throw new RixSourceLimitError(limit, limits[limit], offset, endOffset);
}
function checkAstLimits(ast, limits) {
  const work = [[ast, 0]];
  const seen = new WeakSet;
  let count = 0;
  while (work.length) {
    const [value, parentDepth] = work.pop();
    if (!value || typeof value !== "object" || seen.has(value))
      continue;
    seen.add(value);
    const node = !Array.isArray(value) && typeof value.type === "string";
    const depth = parentDepth + (node ? 1 : 0);
    if (node) {
      checkSourceLimit("nodes", ++count, limits, value.pos?.[1] || 0, value.pos?.[2]);
      checkSourceLimit("astDepth", depth, limits, value.pos?.[1] || 0, value.pos?.[2]);
    }
    for (const [key2, child] of Object.entries(value)) {
      if (key2 === "systemInfo" || key2 === "pos")
        continue;
      if (child && typeof child === "object")
        work.push([child, depth]);
    }
  }
  return ast;
}

// ../../rix/src/parser/tokenizer.js
function codePointAt(source, offset) {
  const point = source.codePointAt(offset);
  return point === undefined ? "" : String.fromCodePoint(point);
}
var identifierStart = /[\p{L}_]/u;
var identifierPart = /[\p{L}\p{N}_]/u;
var symbols = [
  ":=:",
  ":>=:",
  ":<=:",
  ":>:",
  ":<:",
  ":->",
  "|\\/|",
  "\\/=",
  "/\\=",
  "\\/",
  "/\\",
  "??!-",
  "??-",
  "?!-",
  "?-",
  "^=>",
  "?/\\",
  "!/\\",
  "?&",
  "!!",
  "!?",
  "++=",
  "++",
  "<<",
  ">>",
  "<>",
  "_>!",
  "_>",
  "~>",
  "<_",
  "*>",
  "<*",
  "||>",
  "~~=",
  "::=",
  ":::",
  "//=",
  "**=",
  "/^=",
  "/~=",
  "|>&&",
  "|>||",
  "|>_",
  "|>!",
  "|>>",
  "|:>",
  "|>:",
  "|>?",
  "|><",
  "|<>",
  "|;",
  "|}",
  "|>/|",
  "|>#|",
  "|>//",
  "|>/",
  "|>",
  "/%",
  "//",
  "/^",
  "/~",
  "::+",
  ":~/",
  ":/:",
  ":~",
  ":/%",
  "::",
  ":+",
  ":%",
  "~!:",
  "~:",
  "~=",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "^^",
  "^=",
  "\\=",
  "===",
  "<=",
  ">=",
  "==",
  "!=",
  "&&",
  "||",
  ">:",
  "<",
  ">",
  "->",
  "=>",
  "**",
  "?=",
  "?_>",
  "??>",
  "?_",
  "??",
  "?:",
  "?|",
  "@_",
  "|^:",
  "|+",
  "|*",
  "|:",
  "|;",
  "|^",
  "|?",
  "~{",
  "~[",
  ":=",
  "...",
  "..",
  "|.",
  ".|",
  ".=",
  "{!",
  "#",
  "%",
  ",",
  ";",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "+",
  "-",
  "*",
  "/",
  "^",
  "_",
  ".",
  "~",
  "@@",
  "@",
  "$$",
  "$",
  "=",
  "'",
  ":",
  "?",
  "!",
  "\\"
];
function posToLineCol(input, pos) {
  let line = 1;
  let col = 1;
  for (let i = 0;i < pos && i < input.length; i++) {
    if (input[i] === `
`) {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}
function tokenize(input, options = {}) {
  return tokenizeSource(input, options, false).tokens;
}
function tokenizeSource(input, options, recover) {
  if (typeof input !== "string")
    throw new TypeError("Source must be a string");
  const limits = sourceLimits(options);
  const tokens = [];
  const diagnostics = [];
  let truncated = false;
  try {
    checkSourceLimit("sourceLength", input.length, limits);
  } catch (error) {
    if (!recover)
      throw error;
    return { tokens: [{ type: "End", original: "", value: null, pos: [0, 0, 0] }], diagnostics: [error], truncated: true };
  }
  let position = 0;
  while (position < input.length) {
    const startPos = position;
    while (position < input.length && /\s/.test(input[position])) {
      position++;
    }
    if (position >= input.length) {
      tokens.push({
        type: "End",
        original: input.slice(startPos),
        value: null,
        pos: [startPos, startPos, input.length]
      });
      break;
    }
    try {
      checkSourceLimit("tokens", tokens.length + 1, limits, position);
      let token = null;
      token = tryMatchPostfixCheck(input, position);
      if (!token) {
        token = tryMatchComment(input, position);
      }
      if (!token) {
        token = tryMatchActiveBaseNumber(input, position);
      }
      if (!token) {
        token = tryMatchNumber(input, position);
      }
      if (!token) {
        token = tryMatchExplicitCF(input, position);
      }
      if (!token) {
        token = tryMatchString(input, position);
      }
      if (!token) {
        token = tryMatchSystemFunctionRef(input, position);
      }
      if (!token) {
        token = tryMatchOuterIdentifier(input, position);
      }
      if (!token) {
        token = tryMatchIdentifier(input, position);
      }
      if (!token) {
        token = tryMatchCustomOperator(input, position);
      }
      if (!token) {
        token = tryMatchRegexLiteral(input, position);
      }
      if (!token) {
        token = tryMatchBrace(input, position);
      }
      if (!token) {
        token = tryMatchSemicolonSequence(input, position);
      }
      if (!token) {
        token = tryMatchSymbol(input, position);
      }
      if (token) {
        checkSourceLimit("tokenLength", token.original.length, limits, position, token.pos[2]);
        if (token.type === "Number" || token.type === "ActiveBaseNumber") {
          checkSourceLimit("numeralLength", token.original.length, limits, position, token.pos[2]);
        }
        const whitespace = input.slice(startPos, position);
        token.original = whitespace + token.original;
        token.pos[0] = startPos;
        if (token.type !== "String") {
          token.pos[1] = position;
        }
        tokens.push(token);
        position += token.original.length - whitespace.length;
      } else {
        const error = new SyntaxError(`Unrecognized source character at position ${position}`);
        error.code = "RXP1002";
        throw error;
      }
    } catch (error) {
      error.code ||= "RXP1002";
      error.offset ??= position;
      error.endOffset ??= position + String.fromCodePoint(input.codePointAt(position) || 0).length;
      if (!recover)
        throw error;
      diagnostics.push(error);
      if (error instanceof RixSourceLimitError || diagnostics.length >= limits.recoveryErrors) {
        truncated = true;
        break;
      }
      const newline = input.indexOf(`
`, position);
      const end = newline < 0 ? input.length : newline + 1;
      tokens.push({ type: "Invalid", original: input.slice(startPos, end), value: null, pos: [startPos, position, end] });
      position = end;
    }
  }
  if (tokens.length === 0 || tokens[tokens.length - 1].type !== "End") {
    tokens.push({
      type: "End",
      original: "",
      value: null,
      pos: [input.length, input.length, input.length]
    });
  }
  return { tokens, diagnostics, truncated };
}
function tryMatchCustomOperator(input, position) {
  if (!input.startsWith(":<", position))
    return null;
  let end = -1;
  for (let cursor = position + 2;cursor < input.length; cursor += 1) {
    if (input.startsWith(">:", cursor)) {
      end = cursor;
      break;
    }
    if (input[cursor] === ":")
      return null;
    if (/\s/u.test(input[cursor]))
      break;
  }
  if (end < 0) {
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Unclosed custom operator delimiter at line ${line}:${col}`);
  }
  const value = input.slice(position + 2, end);
  if (!value || /[<>:\s]/u.test(value)) {
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Invalid custom operator delimiter at line ${line}:${col}`);
  }
  const original = input.slice(position, end + 2);
  return {
    type: "CustomOperator",
    original,
    value,
    pos: [position, position, end + 2]
  };
}
function tryMatchPostfixCheck(input, position) {
  const longMarker = input.slice(position, position + 4);
  if (longMarker === "##!>") {
    return {
      type: "Symbol",
      original: longMarker,
      value: longMarker,
      pos: [position, position, position + longMarker.length]
    };
  }
  const marker = input.slice(position, position + 3);
  if (marker !== "##@" && marker !== "##:" && marker !== "##!" && marker !== "##_")
    return null;
  return {
    type: "Symbol",
    original: marker,
    value: marker,
    pos: [position, position, position + marker.length]
  };
}
function tryMatchComment(input, position) {
  const remaining = input.slice(position);
  if (!remaining.startsWith("##"))
    return null;
  let tagEndIndex = -1;
  let hasSpaceInTag = false;
  for (let i = 2;i < remaining.length - 1; i++) {
    if (remaining[i] === "#" && remaining[i + 1] === "#") {
      tagEndIndex = i;
      break;
    }
    if (/\s/.test(remaining[i])) {
      hasSpaceInTag = true;
      break;
    }
  }
  if (tagEndIndex !== -1 && !hasSpaceInTag) {
    const tag = remaining.slice(2, tagEndIndex);
    const normalizedTag = tag.toLowerCase();
    const openDelimiter = `##${tag}##`;
    const closeDelimiter = `##${normalizedTag}##`;
    let searchPos = tagEndIndex + 2;
    while (searchPos < remaining.length - (normalizedTag.length + 4) + 1) {
      const potentialCloseStart = remaining.indexOf("##", searchPos);
      if (potentialCloseStart === -1)
        break;
      const potentialCloseTagEnd = remaining.indexOf("##", potentialCloseStart + 2);
      if (potentialCloseTagEnd === -1)
        break;
      const foundTag = remaining.slice(potentialCloseStart + 2, potentialCloseTagEnd).toLowerCase();
      if (foundTag === normalizedTag) {
        const totalLength = potentialCloseTagEnd + 2;
        const value = remaining.slice(tagEndIndex + 2, potentialCloseStart);
        return {
          type: "String",
          original: remaining.slice(0, totalLength),
          value,
          kind: "comment",
          pos: [position, position + tagEndIndex + 2, position + totalLength]
        };
      }
      searchPos = potentialCloseStart + 1;
    }
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Unclosed multi-line comment with tag "${tag}" at line ${line}:${col}`);
  }
  let lineEndIndex = remaining.indexOf(`
`);
  if (lineEndIndex === -1)
    lineEndIndex = remaining.length;
  return {
    type: "String",
    original: remaining.slice(0, lineEndIndex),
    value: remaining.slice(2, lineEndIndex),
    kind: "comment",
    pos: [position, position + 2, position + lineEndIndex]
  };
}
function tryMatchString(input, position) {
  const remaining = input.slice(position);
  const blockCommentMatch = remaining.match(/^\/(\*+)/);
  if (blockCommentMatch) {
    const starCount = blockCommentMatch[1].length;
    const fullPattern = new RegExp(`^\\/\\*{${starCount}}([\\s\\S]*?)\\*{${starCount}}\\/`);
    const match = remaining.match(fullPattern);
    if (match) {
      return {
        type: "String",
        original: match[0],
        value: match[1],
        kind: "comment",
        pos: [
          position,
          position + blockCommentMatch[0].length,
          position + match[0].length
        ]
      };
    }
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Delimiter unmatched at line ${line}:${col}. Need ${starCount} stars followed by slash.`);
  }
  const quoteMatch = remaining.match(/^("+)/);
  if (quoteMatch) {
    const quoteCount = quoteMatch[1].length;
    let searchPos = position + quoteCount;
    while (searchPos < input.length) {
      const foundQuotes = input.slice(searchPos).match(/^("+)/);
      if (foundQuotes && foundQuotes[1].length === quoteCount) {
        const content = input.slice(position + quoteCount, searchPos);
        const original = input.slice(position, searchPos + quoteCount);
        return {
          type: "String",
          original,
          value: content,
          kind: "quote",
          pos: [position, position + quoteCount, searchPos + quoteCount]
        };
      }
      searchPos++;
    }
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Delimiter unmatched at line ${line}:${col}. Need ${quoteCount} closing quotes.`);
  }
  const backtickMatch = remaining.match(/^(`+)/);
  if (backtickMatch) {
    const backtickCount = backtickMatch[1].length;
    let searchPos = position + backtickCount;
    while (searchPos < input.length) {
      const foundBackticks = input.slice(searchPos).match(/^(`+)/);
      if (foundBackticks && foundBackticks[1].length === backtickCount) {
        const content = input.slice(position + backtickCount, searchPos);
        const original = input.slice(position, searchPos + backtickCount);
        return {
          type: "String",
          original,
          value: content,
          kind: "backtick",
          pos: [position, position + backtickCount, searchPos + backtickCount]
        };
      }
      searchPos++;
    }
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Delimiter unmatched at line ${line}:${col}. Need ${backtickCount} closing backticks.`);
  }
  return null;
}
function tryMatchExplicitCF(input, position) {
  const remaining = input.slice(position);
  let match = remaining.match(/^~-?(?:0z\[\d+\]|0[a-zA-Z])[0-9a-zA-Z]+\.~[0-9a-zA-Z]+(?:~[0-9a-zA-Z]+)*\?(?:[0-9a-zA-Z]+(?:~[0-9a-zA-Z]+)*)?/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^~-?\d+\.~\d+(?:~\d+)*\?(?:\d+(?:~\d+)*)?/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^~-?(?:0z\[\d+\]|0[a-zA-Z])[0-9a-zA-Z]+\.\~[0-9a-zA-Z]+(?:~[0-9a-zA-Z]+)*/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^~-?\d+\.~\d+(?:~\d+)*/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  return null;
}
function tryMatchNumber(input, position) {
  const remaining = input.slice(position);
  let match;
  if (!/^(\d|\.\d)/.test(remaining)) {
    return null;
  }
  match = remaining.match(/^(?:\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)\?(?:\d(?:_?\d)*)?(?:\[[^\]]+\])?/);
  if (match) {
    const after = remaining[match[0].length] ?? "";
    const markerHasPayload = /\?\d/.test(match[0]) || match[0].includes("[");
    if (markerHasPayload || !/[(_!:=|&?-]/.test(after)) {
      return {
        type: "Number",
        original: match[0],
        value: match[0],
        pos: [position, position, position + match[0].length]
      };
    }
  }
  match = remaining.match(/^(?:0z\[\d+\]|0[a-zA-Z])[0-9a-zA-Z]+\.~[0-9a-zA-Z]+(?:~[0-9a-zA-Z]+)*\?(?:[0-9a-zA-Z]+(?:~[0-9a-zA-Z]+)*)?/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^(?:0z\[\d+\]|0[a-zA-Z])[0-9a-zA-Z]+(?:\.[0-9a-zA-Z]*)?\?(?:[0-9a-zA-Z]+)?/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?(?:0z\[\d+\]|0[a-zA-Z])[0-9a-zA-Z]+\.~[0-9a-zA-Z]+(?:~[0-9a-zA-Z]+)*/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?(?:0z\[\d+\]|0[a-zA-Z])[0-9a-zA-Z]+(?:\.[0-9a-zA-Z]*)?#[0-9a-zA-Z]+/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?0[A-Z]"(?:[^"\\]|\\.)*"/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?0[A-Z][0-9A-Za-z@&./#~_^+-]*/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?(?:0z\[\d+\]|0[a-zA-Z])[0-9a-zA-Z]*\.\.(?:0z\[\d+\]|0[a-zA-Z])?[0-9a-zA-Z]*\/(?:0z\[\d+\]|0[a-zA-Z])?[0-9a-zA-Z]*/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?(?:0z\[\d+\]|0[a-zA-Z])[0-9a-zA-Z]*\.[0-9a-zA-Z]*/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?(?:0z\[\d+\]|0[a-zA-Z])[0-9a-zA-Z]*/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^\d+\.~\d+(?:~\d+)*\?(?:\d+(?:~\d+)*)?/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^\d+\.~\d+(?:~\d+)*/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?(?:\d(?:_?\d)*\.\d(?:_?\d)*#\d(?:_?\d)*|\.\d(?:_?\d)*#\d(?:_?\d)*|\d(?:_?\d)*\.\.\d(?:_?\d)*\/\d(?:_?\d)*|\d(?:_?\d)*\.\d(?:_?\d)*|\.\d(?:_?\d)*|\d(?:_?\d)*)_\^[+-]?\d(?:_?\d)*/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?\d+\.\.\d+\/\d+/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?(?:\d+\.\d*#\d+|\.\d*#\d+)/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?\d+#\d+/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^-?(?:\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)\[[^\]]+\]/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^(?:(?:\d(?:_?\d)*|\{\d+~\d+\})+(?:\.(?:\d(?:_?\d)*|\{\d+~\d+\})+)?|\.(?:\d(?:_?\d)*|\{\d+~\d+\})+)(?:#(?:\d(?:_?\d)*|\{\d+~\d+\})+)?/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^(?:\d(?:_?\d)*\.\d(?:_?\d)*|\.\d(?:_?\d)*)/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  match = remaining.match(/^\d(?:_?\d)*/);
  if (match) {
    return {
      type: "Number",
      original: match[0],
      value: match[0],
      pos: [position, position, position + match[0].length]
    };
  }
  return null;
}
function tryMatchActiveBaseNumber(input, position) {
  if (input[position] !== "#" || input[position + 1] === "#")
    return null;
  const remaining = input.slice(position);
  const consumeMethodLikeSuffix = (spelling) => {
    const suffix = remaining.slice(spelling.length).match(/^\.[\p{L}\p{N}_@&]+/u)?.[0] || "";
    return spelling + suffix;
  };
  const quotedComponent = "#`(?:[^`\\\\]|\\\\.)+`";
  const quotedMixed = new RegExp(`^(${quotedComponent})\\.\\.(${quotedComponent})\\/(${quotedComponent})`, "u");
  const quotedContinued = new RegExp(`^(${quotedComponent})\\.~(${quotedComponent}(?:~${quotedComponent})*)`, "u");
  const composite = remaining.match(quotedMixed) || remaining.match(quotedContinued);
  if (composite) {
    const original2 = consumeMethodLikeSuffix(composite[0]);
    if (original2 !== composite[0]) {
      return {
        type: "ActiveBaseNumber",
        original: original2,
        value: original2,
        quoted: false,
        pos: [position, position, position + original2.length]
      };
    }
    const components = [...composite[0].matchAll(/#`((?:[^`\\]|\\.)+)`/gu)].map((part) => part[1].replace(/\\`/g, "`").replace(/\\\\/g, "\\"));
    return {
      type: "ActiveBaseNumber",
      original: composite[0],
      value: {
        form: composite[0].includes("..") ? "mixed" : "continued",
        components
      },
      quoted: true,
      pos: [position, position, position + composite[0].length]
    };
  }
  const quoted = remaining.match(/^#`((?:[^`\\]|\\.)+)`/u);
  if (quoted) {
    const original2 = consumeMethodLikeSuffix(quoted[0]);
    if (original2 !== quoted[0]) {
      return {
        type: "ActiveBaseNumber",
        original: original2,
        value: original2,
        quoted: false,
        pos: [position, position, position + original2.length]
      };
    }
    return {
      type: "ActiveBaseNumber",
      original: quoted[0],
      value: quoted[1].replace(/\\`/g, "`").replace(/\\\\/g, "\\"),
      quoted: true,
      pos: [position, position, position + quoted[0].length]
    };
  }
  const digit = "[\\p{L}\\p{N}_@&]";
  const digits = `${digit}+`;
  const active = `#${digits}`;
  const component = `${digits}(?:\\.${digit}*)?(?:#${digits})?`;
  const mixed = new RegExp(`^#${digits}\\.\\.#?${digits}\\/#?${digits}`, "u");
  const explicitContinued = new RegExp(`^#~-?${digits}\\.~#?${digits}(?:~#?${digits})*`, "u");
  const continued = new RegExp(`^#${digits}\\.~#?${digits}(?:~#?${digits})*`, "u");
  const ordinary = new RegExp(`^#${component}`, "u");
  const match = remaining.match(mixed) || remaining.match(explicitContinued) || remaining.match(continued) || remaining.match(ordinary);
  if (!match)
    return null;
  const original = consumeMethodLikeSuffix(match[0]);
  return {
    type: "ActiveBaseNumber",
    original,
    value: original,
    quoted: false,
    pos: [position, position, position + original.length]
  };
}
function scanNumberLiteral(input, position = 0) {
  return tryMatchNumber(input, position) || tryMatchExplicitCF(input, position);
}
function tryMatchSystemFunctionRef(input, position) {
  const remaining = input.slice(position);
  if (remaining.startsWith("@_") && remaining.length > 2 && identifierStart.test(codePointAt(remaining, 2))) {
    let length = 2 + codePointAt(remaining, 2).length;
    while (length < remaining.length && identifierPart.test(codePointAt(remaining, length))) {
      length += codePointAt(remaining, length).length;
    }
    const original = remaining.slice(0, length);
    const name = remaining.slice(2, length);
    const value = name[0].toUpperCase() + name.slice(1).toUpperCase();
    return {
      type: "Identifier",
      original,
      value,
      kind: "SystemFunction",
      pos: [position, position, position + length]
    };
  }
  return null;
}
function tryMatchIdentifier(input, position) {
  const remaining = input.slice(position);
  if (remaining[0] === "_") {
    const placeholderMatch = remaining.match(/^_+(\d+)/);
    if (placeholderMatch) {
      const original2 = placeholderMatch[0];
      const place = parseInt(placeholderMatch[1], 10);
      return {
        type: "PlaceHolder",
        original: original2,
        place,
        pos: [position, position, position + original2.length]
      };
    }
  }
  if (!identifierStart.test(codePointAt(remaining, 0))) {
    return null;
  }
  let length = codePointAt(remaining, 0).length;
  while (length < remaining.length && identifierPart.test(codePointAt(remaining, length))) {
    length += codePointAt(remaining, length).length;
  }
  const original = remaining.slice(0, length);
  if (original === "_") {
    return null;
  }
  let firstLetter = null;
  for (const char of original) {
    if (/[\p{L}]/u.test(char)) {
      firstLetter = char;
      break;
    }
  }
  const isCapital = firstLetter !== null && firstLetter.toUpperCase() === firstLetter;
  const kind = isCapital ? "System" : "User";
  const value = isCapital ? original.toUpperCase() : original.toLowerCase();
  return {
    type: "Identifier",
    original,
    value,
    kind,
    pos: [position, position, position + length]
  };
}
function normalizeIdentifierValue(original) {
  let firstLetter = null;
  for (const char of original) {
    if (/[\p{L}]/u.test(char)) {
      firstLetter = char;
      break;
    }
  }
  const isCapital = firstLetter !== null && firstLetter.toUpperCase() === firstLetter;
  return isCapital ? original.toUpperCase() : original.toLowerCase();
}
function tryMatchSemicolonSequence(input, position) {
  const remaining = input.slice(position);
  const match = remaining.match(/^;+/);
  if (match) {
    const sequence = match[0];
    const count = sequence.length;
    if (count > 1) {
      return {
        type: "SemicolonSequence",
        original: sequence,
        value: sequence,
        count,
        pos: [position, position, position + sequence.length]
      };
    }
  }
  return null;
}
function tryMatchBrace(input, position) {
  if (input[position] !== "{")
    return null;
  const isWhitespace = (c) => c === " " || c === "\t" || c === `
` || c === "\r" || c === undefined;
  const ch = input[position + 1];
  const makeAdvancedConstructorToken = (value, start, end, extras = {}) => ({
    type: "Symbol",
    original: input.slice(position, end),
    value,
    pos: [position, position, end],
    ...extras
  });
  if (ch === "$") {
    const start = position + 2;
    const first = input[start];
    const requireBoundary = (end2, label) => {
      const afterHeader = input[end2];
      if (!isWhitespace(afterHeader) && afterHeader !== "}") {
        const { line: line2, col: col2 } = posToLineCol(input, position);
        throw new Error(`${label} must be followed by a space or '}' at line ${line2}:${col2}`);
      }
    };
    if (first === "$") {
      const end2 = start + 1;
      requireBoundary(end2, "Detached block header '{$$'");
      return makeAdvancedConstructorToken("{$$", position, end2, { detached: true });
    }
    if (isWhitespace(first)) {
      return makeAdvancedConstructorToken("{$", position, start, { containerName: null });
    }
    let cursor = start;
    let containerName = null;
    if (/[a-zA-Z0-9_]/.test(input[cursor] || "")) {
      const nameStart = cursor;
      while (cursor < input.length && /[a-zA-Z0-9_]/.test(input[cursor]))
        cursor++;
      containerName = input.slice(nameStart, cursor).toLowerCase();
      if (input[cursor] === "$") {
        const end2 = cursor + 1;
        requireBoundary(end2, `Named async scope '{$${containerName}$'`);
        return makeAdvancedConstructorToken("{$", position, end2, { containerName });
      }
    }
    if (input[cursor] !== ":") {
      const { line: line2, col: col2 } = posToLineCol(input, position);
      throw new Error(`Async scope '{$' must be followed by a space, '$', 'name$', or a ':' option header ending in '$' at line ${line2}:${col2}`);
    }
    cursor++;
    const optionsStart = cursor;
    while (cursor < input.length && input[cursor] !== "$")
      cursor++;
    if (input[cursor] !== "$") {
      const { line: line2, col: col2 } = posToLineCol(input, position);
      throw new Error(`Async scope option header must end in '$' at line ${line2}:${col2}`);
    }
    const rawOptions = input.slice(optionsStart, cursor);
    const parsePositive = (raw, label) => {
      if (!/^\d+$/.test(raw)) {
        const { line: line2, col: col2 } = posToLineCol(input, position);
        throw new Error(`Async ${label} must be a positive integer at line ${line2}:${col2}`);
      }
      const value = Number(raw);
      if (!Number.isSafeInteger(value) || value < 1) {
        const { line: line2, col: col2 } = posToLineCol(input, position);
        throw new Error(`Invalid async ${label} '${raw}' at line ${line2}:${col2}`);
      }
      return value;
    };
    let asyncLimit;
    let asyncTimeout;
    const pieces = rawOptions.split(",").map((piece) => piece.trim());
    const keyed = pieces.some((piece) => piece.includes("="));
    if (keyed) {
      if (pieces.some((piece) => !piece.includes("="))) {
        const { line: line2, col: col2 } = posToLineCol(input, position);
        throw new Error(`Async scope options cannot mix keyed and positional fields at line ${line2}:${col2}`);
      }
      const seen = new Set;
      for (const piece of pieces) {
        const match = piece.match(/^(limit|timeout)\s*=\s*(\d+)$/i);
        if (!match) {
          const { line: line2, col: col2 } = posToLineCol(input, position);
          throw new Error(`Malformed async scope option '${piece}' at line ${line2}:${col2}`);
        }
        const key2 = match[1].toLowerCase();
        if (seen.has(key2)) {
          const { line: line2, col: col2 } = posToLineCol(input, position);
          throw new Error(`Duplicate async scope option '${key2}' at line ${line2}:${col2}`);
        }
        seen.add(key2);
        if (key2 === "limit")
          asyncLimit = parsePositive(match[2], "concurrency limit");
        else
          asyncTimeout = parsePositive(match[2], "timeout");
      }
    } else {
      if (pieces.length > 2 || pieces.length === 0 || pieces.length === 1 && pieces[0] === "") {
        const { line: line2, col: col2 } = posToLineCol(input, position);
        throw new Error(`Async positional header expects limit and optional timeout at line ${line2}:${col2}`);
      }
      if (pieces[0] !== "")
        asyncLimit = parsePositive(pieces[0], "concurrency limit");
      if (pieces.length > 1) {
        if (pieces[1] === "") {
          const { line: line2, col: col2 } = posToLineCol(input, position);
          throw new Error(`Async timeout cannot be omitted after ',' at line ${line2}:${col2}`);
        }
        asyncTimeout = parsePositive(pieces[1], "timeout");
      }
      if (asyncLimit === undefined && asyncTimeout === undefined) {
        const { line: line2, col: col2 } = posToLineCol(input, position);
        throw new Error(`Async scope header must specify a limit or timeout at line ${line2}:${col2}`);
      }
    }
    if (asyncLimit === undefined && asyncTimeout === undefined) {
      const { line: line2, col: col2 } = posToLineCol(input, position);
      throw new Error(`Async scope header must specify a limit or timeout at line ${line2}:${col2}`);
    }
    const end = cursor + 1;
    requireBoundary(end, "Async scope header");
    return makeAdvancedConstructorToken("{$", position, end, {
      containerName,
      ...asyncLimit !== undefined ? { asyncLimit } : {},
      ...asyncTimeout !== undefined ? { asyncTimeout } : {}
    });
  }
  if (input.slice(position + 1).startsWith("=..")) {
    const after = input[position + 4];
    if (!isWhitespace(after) && after !== "}") {
      const { line: line2, col: col2 } = posToLineCol(input, position);
      throw new Error(`Brace array alias '{=..' must be followed by a space or '}' at line ${line2}:${col2}`);
    }
    return makeAdvancedConstructorToken("{..", position, position + 4, {
      destructureAlias: true
    });
  }
  if (input.slice(position + 1).startsWith("=:")) {
    let cursor = position + 3;
    let name = "";
    while (cursor < input.length && /[0-9x]/i.test(input[cursor])) {
      name += input[cursor];
      cursor++;
    }
    if (name.length > 0 && input[cursor] === ":") {
      const after = input[cursor + 1];
      if (!isWhitespace(after) && after !== "/" && after !== "}") {
        const { line: line2, col: col2 } = posToLineCol(input, position);
        throw new Error(`Brace shaped alias '{=:${name}:' must be followed by a space, header, or '}' at line ${line2}:${col2}`);
      }
      return makeAdvancedConstructorToken("{:", position, cursor + 1, {
        containerName: name.toLowerCase(),
        destructureAlias: true
      });
    }
  }
  if (input.slice(position + 1).startsWith("..")) {
    const after = input[position + 3];
    if (!isWhitespace(after) && after !== "}") {
      const { line: line2, col: col2 } = posToLineCol(input, position);
      throw new Error(`Brace array '{..' must be followed by a space or '}' at line ${line2}:${col2}`);
    }
    return makeAdvancedConstructorToken("{..", position, position + 3);
  }
  const operatorSequences = ["&&", "||", "\\/", "/\\", "++", "<<", ">>", "+", "*"];
  for (const seq of operatorSequences) {
    if (input.slice(position + 1).startsWith(seq)) {
      const after = input[position + 1 + seq.length];
      if (!isWhitespace(after)) {
        const { line: line2, col: col2 } = posToLineCol(input, position);
        throw new Error(`Operator brace '{${seq}' must be followed by a space at line ${line2}:${col2}`);
      }
      return {
        type: "Symbol",
        original: "{" + seq,
        value: "{" + seq,
        pos: [position, position, position + 1 + seq.length]
      };
    }
  }
  const sigilChars = new Set(["@", ";", "|", ":", "=", "?", "$", "#", "^", ">", "~", "&"]);
  if (sigilChars.has(ch)) {
    const sigil = ch;
    const after = input[position + 2];
    if (sigil === "#") {
      const specHeader = tryMatchSystemSpecHeader(input, position);
      if (specHeader) {
        return specHeader;
      }
    }
    if (isWhitespace(after) || after === "/") {
      return {
        type: "Symbol",
        original: "{" + sigil,
        value: "{" + sigil,
        containerName: null,
        pos: [position, position, position + 2]
      };
    }
    if (sigil === "@") {
      const loopHeader = tryMatchLoopHeader(input, position);
      if (loopHeader) {
        return loopHeader;
      }
    }
    if (after !== undefined && /[a-zA-Z0-9_]/.test(after)) {
      let nameLen = 0;
      while (position + 2 + nameLen < input.length && /[a-zA-Z0-9_]/.test(input[position + 2 + nameLen])) {
        nameLen++;
      }
      const name = input.slice(position + 2, position + 2 + nameLen);
      const closingSigilPos = position + 2 + nameLen;
      if (input[closingSigilPos] === sigil) {
        const afterName = input[closingSigilPos + 1];
        if (!isWhitespace(afterName) && afterName !== "}") {
          const { line: line4, col: col4 } = posToLineCol(input, position);
          throw new Error(`Named container '{${sigil}${name}${sigil}' must be followed by a space or '}' at line ${line4}:${col4}`);
        }
        const tokenLen = 1 + 1 + nameLen + 1;
        return {
          type: "Symbol",
          original: "{" + sigil + name + sigil,
          value: "{" + sigil,
          containerName: name.toLowerCase(),
          pos: [position, position, position + tokenLen]
        };
      }
      const { line: line3, col: col3 } = posToLineCol(input, position);
      throw new Error(`Brace sigil '{${sigil}' must be followed by a space or 'name${sigil}' (e.g. '{${sigil}myname${sigil} ...') at line ${line3}:${col3}`);
    }
    const { line: line2, col: col2 } = posToLineCol(input, position);
    throw new Error(`Brace sigil '{${sigil}' must be followed by a space or a name (e.g. '{${sigil} ...' or '{${sigil}myname${sigil} ...') at line ${line2}:${col2}`);
  }
  if (isWhitespace(ch)) {
    return {
      type: "Symbol",
      original: "{",
      value: "{",
      pos: [position, position, position + 1]
    };
  }
  if (ch === "!" || ch === "}" || ch === undefined || ch >= "0" && ch <= "9") {
    return null;
  }
  const { line, col } = posToLineCol(input, position);
  throw new Error(`'{' must be followed by a space, a sigil (@;|:=?$#^>~), or an operator (+, *, &&, ||, \\/, /\\, ++, <<, >>) at line ${line}:${col}`);
}
function tryMatchSystemSpecHeader(input, position) {
  const start = position + 2;
  const first = input[start];
  if (first === "}" || first === undefined || first === " " || first === "\t" || first === `
` || first === "\r") {
    return {
      type: "Symbol",
      original: "{#",
      value: "{#",
      specHeaderPresent: false,
      specInputs: [],
      specOutputs: [],
      specOutputsDeclared: false,
      pos: [position, position, position + 2]
    };
  }
  const identityMatch = input.slice(start).match(/^([\p{L}_][\p{L}\p{N}_]*)\}/u);
  if (identityMatch) {
    const name = normalizeIdentifierValue(identityMatch[1]);
    return {
      type: "Symbol",
      original: input.slice(position, start + identityMatch[1].length),
      value: "{#",
      specHeaderPresent: true,
      specIdentity: true,
      specInputs: [name],
      specOutputs: [],
      specOutputsDeclared: false,
      pos: [position, position, start + identityMatch[1].length]
    };
  }
  const closing = input.indexOf("#", start);
  if (closing === -1) {
    const { line, col } = posToLineCol(input, position);
    throw new Error(`System spec header must end with '#' at line ${line}:${col}`);
  }
  const after = input[closing + 1];
  if (!(after === "}" || after === undefined || after === " " || after === "\t" || after === `
` || after === "\r")) {
    const { line, col } = posToLineCol(input, position);
    throw new Error(`System spec header must be followed by a space or '}' at line ${line}:${col}`);
  }
  const rawHeader = input.slice(start, closing);
  const colonCount = (rawHeader.match(/:/g) || []).length;
  if (colonCount > 1) {
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Malformed system spec header '${rawHeader}' at line ${line}:${col}`);
  }
  const parseHeaderList = (text4, label) => {
    const trimmed = text4.trim();
    if (!trimmed)
      return [];
    return trimmed.split(",").map((piece) => {
      const name = piece.trim();
      if (!name) {
        const { line, col } = posToLineCol(input, position);
        throw new Error(`Malformed ${label} list in system spec header at line ${line}:${col}`);
      }
      if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(name)) {
        const { line, col } = posToLineCol(input, position);
        throw new Error(`System spec ${label} must be bare identifiers; got '${name}' at line ${line}:${col}`);
      }
      return normalizeIdentifierValue(name);
    });
  };
  const pieces = rawHeader.split(":");
  const inputs = parseHeaderList(pieces[0] ?? "", "inputs");
  const outputs = parseHeaderList(pieces[1] ?? "", "outputs");
  return {
    type: "Symbol",
    original: input.slice(position, closing + 1),
    value: "{#",
    specHeaderPresent: true,
    specHeaderRaw: rawHeader,
    specInputs: inputs,
    specOutputs: outputs,
    specOutputsDeclared: pieces.length === 2,
    pos: [position, position, closing + 1]
  };
}
function tryMatchLoopHeader(input, position) {
  const start = position + 2;
  let cursor = start;
  let containerName = null;
  let loopMax;
  let unlimited = false;
  if (input[cursor] === ":") {
    cursor++;
  } else if (/[a-zA-Z0-9_]/.test(input[cursor] || "")) {
    const nameStart = cursor;
    while (cursor < input.length && /[a-zA-Z0-9_]/.test(input[cursor])) {
      cursor++;
    }
    containerName = input.slice(nameStart, cursor).toLowerCase();
    if (input[cursor] === "@") {
      return finalizeLoopHeader(input, position, cursor + 1, {
        containerName,
        loopMax: undefined,
        unlimited: false
      });
    }
    if (input[cursor] !== ":") {
      const { line, col } = posToLineCol(input, position);
      throw new Error(`Brace sigil '{@' must be followed by a space or a valid loop header ('{@name@', '{@:max@', '{@name:max@', '{@::@', '{@name::@') at line ${line}:${col}`);
    }
    cursor++;
  } else {
    return null;
  }
  if (input[cursor] === ":") {
    unlimited = true;
    cursor++;
    if (input[cursor] !== "@") {
      const { line, col } = posToLineCol(input, position);
      throw new Error(`Unlimited loop header must end with '{@::@' or '{@name::@' at line ${line}:${col}`);
    }
    return finalizeLoopHeader(input, position, cursor + 1, {
      containerName,
      loopMax: undefined,
      unlimited
    });
  }
  const digitsStart = cursor;
  while (cursor < input.length && /[0-9]/.test(input[cursor])) {
    cursor++;
  }
  if (digitsStart === cursor) {
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Loop max must be a nonnegative integer literal at line ${line}:${col}`);
  }
  if (input[cursor] !== "@") {
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Loop header max must end with '@' at line ${line}:${col}`);
  }
  const rawMax = input.slice(digitsStart, cursor);
  const parsedMax = Number(rawMax);
  if (!Number.isSafeInteger(parsedMax) || parsedMax < 0) {
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Invalid loop max '${rawMax}' at line ${line}:${col}`);
  }
  return finalizeLoopHeader(input, position, cursor + 1, {
    containerName,
    loopMax: parsedMax,
    unlimited: false
  });
}
function finalizeLoopHeader(input, position, end, options) {
  const after = input[end];
  if (!(after === "}" || after === undefined || after === " " || after === "\t" || after === `
` || after === "\r")) {
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Loop header must be followed by a space or '}' at line ${line}:${col}`);
  }
  return {
    type: "Symbol",
    original: input.slice(position, end),
    value: "{@",
    containerName: options.containerName ?? null,
    ...options.loopMax !== undefined ? { loopMax: options.loopMax } : {},
    ...options.unlimited ? { loopUnlimited: true } : {},
    pos: [position, position, end]
  };
}
function tryMatchSymbol(input, position) {
  const remaining = input.slice(position);
  if (/^\/(?:==|:=|~=|::=|~~=)\s*\/(?=[\s}])/.test(remaining)) {
    return {
      type: "Symbol",
      original: "/",
      value: "/",
      pos: [position, position, position + 1]
    };
  }
  for (const symbol of symbols) {
    if (remaining.startsWith(symbol)) {
      return {
        type: "Symbol",
        original: symbol,
        value: symbol,
        pos: [position, position, position + symbol.length]
      };
    }
  }
  if (remaining.length > 0) {
    const char = codePointAt(remaining, 0);
    if (!/[\w\s\p{L}\p{N}]/u.test(char)) {
      return {
        type: "Symbol",
        original: char,
        value: char,
        pos: [position, position, position + char.length]
      };
    }
  }
  return null;
}
function tryMatchOuterIdentifier(input, position) {
  const remaining = input.slice(position);
  if (remaining.startsWith("@_"))
    return null;
  if (remaining.startsWith("@") && remaining.length > 1 && identifierStart.test(codePointAt(remaining, 1))) {
    let length = 1 + codePointAt(remaining, 1).length;
    while (length < remaining.length && identifierPart.test(codePointAt(remaining, length))) {
      length += codePointAt(remaining, length).length;
    }
    const original = remaining.slice(0, length);
    const name = remaining.slice(1, length);
    let firstLetter = null;
    for (const char of name) {
      if (/[\p{L}]/u.test(char)) {
        firstLetter = char;
        break;
      }
    }
    const isCapital = firstLetter !== null && firstLetter.toUpperCase() === firstLetter;
    const kind = isCapital ? "System" : "User";
    const value = isCapital ? name.toUpperCase() : name.toLowerCase();
    return {
      type: "OuterIdentifier",
      original,
      value,
      kind,
      pos: [position, position, position + length]
    };
  }
  return null;
}
function tryMatchRegexLiteral(input, position) {
  const remaining = input.slice(position);
  if (remaining.startsWith("{/\\")) {
    let i = 3;
    let inEscape2 = false;
    let foundUnescapedSlash = false;
    while (i < remaining.length && remaining[i] !== "}") {
      const ch = remaining[i];
      if (inEscape2) {
        inEscape2 = false;
      } else if (ch === "\\") {
        inEscape2 = true;
      } else if (ch === "/") {
        foundUnescapedSlash = true;
        break;
      }
      i++;
    }
    if (!foundUnescapedSlash)
      return null;
  }
  const startMatch = remaining.match(/^\{\s*\//);
  if (!startMatch)
    return null;
  const contentStart = startMatch[0].length;
  let searchPos = contentStart;
  let inEscape = false;
  let patternEnd = -1;
  while (searchPos < remaining.length) {
    const char = remaining[searchPos];
    if (inEscape) {
      inEscape = false;
    } else if (char === "\\") {
      inEscape = true;
    } else if (char === "/") {
      patternEnd = searchPos;
      break;
    }
    searchPos++;
  }
  if (patternEnd === -1) {
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Unterminated regex literal at line ${line}:${col}. Expected closing '/'.`);
  }
  const pattern = remaining.slice(contentStart, patternEnd);
  searchPos = patternEnd + 1;
  let flagsStart = searchPos;
  while (searchPos < remaining.length) {
    const char = remaining[searchPos];
    if (char === "}") {
      break;
    }
    searchPos++;
  }
  if (searchPos >= remaining.length || remaining[searchPos] !== "}") {
    const { line, col } = posToLineCol(input, position);
    throw new Error(`Unterminated regex literal at line ${line}:${col}. Expected closing '}'.`);
  }
  const flagsAndModeStr = remaining.slice(flagsStart, searchPos).trim();
  let flags = "";
  let mode = "ONE";
  if (flagsAndModeStr.length > 0) {
    const lastChar = flagsAndModeStr[flagsAndModeStr.length - 1];
    let flagsStr = flagsAndModeStr;
    if (lastChar === "?") {
      mode = "TEST";
      flagsStr = flagsAndModeStr.slice(0, -1);
    } else if (lastChar === "*") {
      mode = "ALL";
      flagsStr = flagsAndModeStr.slice(0, -1);
    } else if (lastChar === ":") {
      mode = "ITER";
      flagsStr = flagsAndModeStr.slice(0, -1);
    }
    flags = flagsStr.trim();
    if (flags.length > 0 && !/^[a-zA-Z]*$/.test(flags)) {
      if (remaining.startsWith("{/\\"))
        return null;
      const { line, col } = posToLineCol(input, position);
      throw new Error(`Invalid modifier or flag in regex literal at line ${line}:${col}.`);
    }
  }
  const endPosition = searchPos + 1;
  const original = remaining.slice(0, endPosition);
  return {
    type: "RegexLiteral",
    original,
    pattern,
    flags,
    mode,
    pos: [position, position, position + original.length]
  };
}

// ../../rix/src/runtime/rixcel-references.js
function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`${label} must be a positive safe integer`);
  return value;
}
function signedInteger(tokens, offset) {
  let sign = 1;
  let token = tokens[offset];
  let start = token?.pos?.[1];
  if (token?.type === "Symbol" && ["+", "-"].includes(token.value)) {
    sign = token.value === "-" ? -1 : 1;
    token = tokens[offset + 1];
  }
  if (token?.type !== "Number" || !/^\d+$/u.test(token.value))
    return null;
  return {
    value: sign * Number(token.value),
    start,
    end: token.pos[2],
    next: tokens[offset]?.type === "Symbol" && ["+", "-"].includes(tokens[offset].value) ? offset + 2 : offset + 1
  };
}
function numericReference(tokens, offset) {
  if (tokens[offset + 1]?.value !== "[")
    return null;
  const coordinates = [];
  let cursor = offset + 2;
  while (cursor < tokens.length) {
    const coordinate = signedInteger(tokens, cursor);
    if (!coordinate)
      return null;
    coordinates.push(coordinate);
    cursor = coordinate.next;
    if (tokens[cursor]?.value === "]")
      return { coordinates, end: cursor + 1 };
    if (tokens[cursor]?.value !== ",")
      return null;
    cursor += 1;
  }
  return null;
}
function rewriteRixCelReferences(source, options = {}) {
  if (typeof source !== "string")
    throw new Error("RiX Ripple formula source must be a string");
  const axis = positiveInteger(options.axis, "RiX Ripple insertion axis");
  const coordinate = positiveInteger(options.coordinate, "RiX Ripple insertion coordinate");
  const count = positiveInteger(options.count ?? 1, "RiX Ripple insertion count");
  const origin = options.originIndex ?? null;
  if (origin !== null && (!Array.isArray(origin) || origin.length < axis)) {
    throw new Error(`RiX Ripple formula origin must contain axis ${axis}`);
  }
  const tokens = tokenize(source);
  const replacements = [];
  const dynamic = [];
  for (let offset = 0;offset < tokens.length; offset += 1) {
    const token = tokens[offset];
    if (token.type !== "Identifier" || !["grid", "near"].includes(token.value))
      continue;
    if (tokens[offset - 1]?.value === ".")
      continue;
    if (tokens[offset + 1]?.value !== "[") {
      dynamic.push({ kind: token.value, position: token.pos[1] });
      continue;
    }
    const reference = numericReference(tokens, offset);
    if (!reference) {
      dynamic.push({ kind: token.value, position: token.pos[1] });
      continue;
    }
    if (reference.coordinates.length < axis)
      continue;
    const component = reference.coordinates[axis - 1];
    let nextValue = component.value;
    if (token.value === "grid") {
      if (nextValue >= coordinate)
        nextValue += count;
    } else {
      if (origin === null) {
        dynamic.push({ kind: "near", position: token.pos[1] });
        continue;
      }
      const oldOrigin = positiveInteger(origin[axis - 1], `RiX Ripple formula origin axis ${axis}`);
      const oldTarget = oldOrigin + nextValue;
      const newOrigin = oldOrigin >= coordinate ? oldOrigin + count : oldOrigin;
      const newTarget = oldTarget >= coordinate ? oldTarget + count : oldTarget;
      nextValue = newTarget - newOrigin;
    }
    if (nextValue !== component.value) {
      replacements.push({ start: component.start, end: component.end, text: String(nextValue) });
    }
    offset = reference.end - 1;
  }
  let rewritten = source;
  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    rewritten = `${rewritten.slice(0, replacement.start)}${replacement.text}${rewritten.slice(replacement.end)}`;
  }
  return Object.freeze({
    source: rewritten,
    rewrites: replacements.length,
    dynamic: Object.freeze(dynamic.map((entry) => Object.freeze(entry)))
  });
}

// ../../rix/src/runtime/rixcel-document.js
var RIXCEL_FORMAT = "rixcel";
var RIXCEL_VERSION = 3;
var RIXCEL_ASSIGNMENT_MODES = FORMULA_SHEET_ASSIGNMENT_MODES;
var ASSIGNMENT_MODES2 = new Set(RIXCEL_ASSIGNMENT_MODES);
var EVENT_TYPES = new Set(["slot:set", "slot:batch", "view:axis-label", "axis:insert", "view:region", "view:format"]);
var importedDocuments = new WeakMap;
var DOCUMENT_VIEW_KEYS = Object.freeze([
  "title",
  "axes",
  "axisLabels",
  "viewAxes",
  "slice",
  "columnLabels",
  "address",
  "regions",
  "formats"
]);
function fail2(path, message) {
  throw new Error(`Invalid RiX Ripple document at ${path}: ${message}`);
}
function plainObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail2(path, "must be an object");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail2(path, "must be a plain object");
  }
  return value;
}
function jsonClone(value, path, seen = new Set) {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      fail2(path, "must not contain non-finite numbers");
    return value;
  }
  if (typeof value !== "object")
    fail2(path, `contains unsupported ${typeof value} value`);
  if (seen.has(value))
    fail2(path, "must not contain cycles");
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return Array.from({ length: value.length }, (_unused, index) => {
        if (!Object.hasOwn(value, index))
          fail2(`${path}[${index}]`, "must not be sparse");
        return jsonClone(value[index], `${path}[${index}]`, seen);
      });
    }
    plainObject(value, path);
    return Object.fromEntries(Object.entries(value).map(([key2, item]) => [
      key2,
      jsonClone(item, `${path}.${key2}`, seen)
    ]));
  } finally {
    seen.delete(value);
  }
}
function documentInput(value) {
  const input = value?.type === "string" ? value.value : value;
  if (typeof input !== "string")
    return input;
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid RiX Ripple JSON: ${error.message}`);
  }
}
function documentId(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail2("$.id", "must be a non-empty string");
  }
  return value;
}
function documentShape(value) {
  if (!Array.isArray(value) || value.length === 0)
    fail2("$.shape", "must be a non-empty array");
  let size = 1;
  const shape = value.map((length, axis) => {
    if (!Number.isSafeInteger(length) || length < 1) {
      fail2(`$.shape[${axis}]`, "must be a positive safe integer");
    }
    size *= length;
    if (!Number.isSafeInteger(size))
      fail2("$.shape", "has too many logical slots");
    return length;
  });
  return { shape, size };
}
function indexKey(index) {
  return index.join(",");
}
function slotId(id, index) {
  return `${id}:slot:${index.join(":")}`;
}
function eventId(id, sequence) {
  return `${id}:event:${sequence}`;
}
function linearOffset(index, shape) {
  let offset = 0;
  for (let axis = 0;axis < shape.length; axis += 1) {
    offset = offset * shape[axis] + index[axis] - 1;
  }
  return offset;
}
function normalizeIndex3(value, shape, path) {
  if (!Array.isArray(value) || value.length !== shape.length) {
    fail2(path, `must contain exactly ${shape.length} indices`);
  }
  return value.map((item, axis) => {
    if (!Number.isSafeInteger(item) || item < 1 || item > shape[axis]) {
      fail2(`${path}[${axis}]`, `must be an integer from 1 through ${shape[axis]}`);
    }
    return item;
  });
}
function normalizeView(value, path) {
  if (value === undefined)
    return {};
  plainObject(value, path);
  return jsonClone(value, path);
}
function normalizeBounds(value, shape, path) {
  const start = normalizeIndex3(value.start, shape, `${path}.start`);
  const end = normalizeIndex3(value.end, shape, `${path}.end`);
  if (start.some((n, axis) => n > end[axis]))
    fail2(path, "start must not exceed end on any axis");
  return { start, end };
}
function regionName(value, path) {
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(value))
    fail2(path, "must be a 1..64 character identifier starting with a letter");
  return value;
}
function normalizeFormat(value, path) {
  plainObject(value, path);
  const result = {};
  for (const [key2, item] of Object.entries(value)) {
    let valid = false;
    if (["bold", "italic"].includes(key2))
      valid = typeof item === "boolean";
    else if (["color", "background"].includes(key2))
      valid = typeof item === "string" && /^#[0-9a-fA-F]{6}$/u.test(item);
    else if (key2 === "align")
      valid = ["left", "center", "right"].includes(item);
    else if (key2 === "numberFormat")
      valid = ["exact", "decimal"].includes(item);
    else if (key2 === "precision")
      valid = Number.isInteger(item) && item >= 0 && item <= 20;
    else
      fail2(`${path}.${key2}`, "unsupported formatting property");
    if (item !== null && !valid)
      fail2(`${path}.${key2}`, "invalid formatting value");
    result[key2] = item;
  }
  return result;
}
function rixCelCellFormat(view, index) {
  const result = {};
  for (const layer of view.formats ?? []) {
    if (index.length !== layer.start.length || !index.every((n, axis) => n >= layer.start[axis] && n <= layer.end[axis]))
      continue;
    for (const [key2, value] of Object.entries(layer.style)) {
      if (value === null)
        delete result[key2];
      else
        result[key2] = value;
    }
  }
  return result;
}
function normalizeDocumentView(value, path, shape) {
  const view = normalizeView(value, path);
  const entries2 = Object.entries(view);
  for (const canonical of DOCUMENT_VIEW_KEYS) {
    const matches = entries2.filter(([key2]) => key2.toLowerCase() === canonical.toLowerCase());
    if (matches.length > 1)
      fail2(path, `contains duplicate case variants for ${canonical}`);
    if (matches.length === 1 && matches[0][0] !== canonical) {
      delete view[matches[0][0]];
      view[canonical] = matches[0][1];
    }
  }
  if (view.regions !== undefined) {
    plainObject(view.regions, `${path}.regions`);
    if (Object.keys(view.regions).length > 256)
      fail2(`${path}.regions`, "exceeds 256 named regions");
    view.regions = Object.fromEntries(Object.entries(view.regions).map(([name, bounds]) => [regionName(name, `${path}.regions`), normalizeBounds(plainObject(bounds, `${path}.regions.${name}`), shape, `${path}.regions.${name}`)]));
  }
  if (view.formats !== undefined) {
    if (!Array.isArray(view.formats) || view.formats.length > 1e4)
      fail2(`${path}.formats`, "must be an array with at most 10000 format layers");
    view.formats = view.formats.map((layer, offset) => {
      const at = `${path}.formats[${offset}]`;
      plainObject(layer, at);
      return { ...normalizeBounds(layer, shape, at), style: normalizeFormat(layer.style, `${at}.style`) };
    });
  }
  if (view.title !== undefined && typeof view.title !== "string") {
    fail2(`${path}.title`, "must be a string");
  }
  if (view.address !== undefined && (typeof view.address !== "string" || view.address.length === 0)) {
    fail2(`${path}.address`, "must be a non-empty string");
  }
  if (view.axes !== undefined) {
    if (!Array.isArray(view.axes) || view.axes.length !== shape.length) {
      fail2(`${path}.axes`, `must contain exactly ${shape.length} names`);
    }
    view.axes.forEach((name, axis) => {
      if (typeof name !== "string" || name.length === 0) {
        fail2(`${path}.axes[${axis}]`, "must be a non-empty string");
      }
    });
  }
  if (view.axisLabels !== undefined) {
    if (!Array.isArray(view.axisLabels) || view.axisLabels.length !== shape.length) {
      fail2(`${path}.axisLabels`, `must contain exactly ${shape.length} axis entries`);
    }
    view.axisLabels.forEach((labels, axis) => {
      if (labels === null)
        return;
      if (!Array.isArray(labels) || labels.length !== shape[axis]) {
        fail2(`${path}.axisLabels[${axis}]`, `must be null or contain exactly ${shape[axis]} labels`);
      }
      labels.forEach((label, index) => {
        if (label !== null && (typeof label !== "string" || label.length === 0)) {
          fail2(`${path}.axisLabels[${axis}][${index}]`, "must be null or a non-empty string");
        }
      });
    });
  }
  const defaultViewAxes = shape.length === 1 ? [1] : [1, 2];
  const viewAxes = view.viewAxes === undefined ? defaultViewAxes : view.viewAxes;
  const visibleCount = shape.length === 1 ? 1 : 2;
  if (!Array.isArray(viewAxes) || viewAxes.length !== visibleCount || viewAxes.some((axis) => !Number.isSafeInteger(axis) || axis < 1 || axis > shape.length) || new Set(viewAxes).size !== viewAxes.length) {
    fail2(`${path}.viewAxes`, `must contain ${visibleCount} distinct valid axis indices`);
  }
  if (view.slice !== undefined) {
    if (!Array.isArray(view.slice) || view.slice.length !== shape.length) {
      fail2(`${path}.slice`, `must contain exactly ${shape.length} entries`);
    }
    const visible = new Set(viewAxes);
    view.slice.forEach((coordinate, axisIndex) => {
      const axis = axisIndex + 1;
      if (visible.has(axis)) {
        if (coordinate !== null)
          fail2(`${path}.slice[${axisIndex}]`, "must be null for a visible axis");
      } else if (!Number.isSafeInteger(coordinate) || coordinate < 1 || coordinate > shape[axisIndex]) {
        fail2(`${path}.slice[${axisIndex}]`, `must be an integer from 1 through ${shape[axisIndex]}`);
      }
    });
  }
  if (view.columnLabels !== undefined && !["dual", "letters", "numbers"].includes(view.columnLabels)) {
    fail2(`${path}.columnLabels`, "must be dual, letters, or numbers");
  }
  return view;
}
function normalizeSlotDefinition(value, path, { defaultView = {} } = {}) {
  const slot = value === undefined ? {} : plainObject(value, path);
  const source = slot.source ?? "_";
  const assignmentMode2 = slot.assignmentMode ?? ":=";
  if (typeof source !== "string" || source.trim().length === 0) {
    fail2(`${path}.source`, "must be a non-empty string");
  }
  if (!ASSIGNMENT_MODES2.has(assignmentMode2)) {
    fail2(`${path}.assignmentMode`, `is not supported: ${assignmentMode2}`);
  }
  return {
    source,
    assignmentMode: assignmentMode2,
    view: normalizeView(slot.view ?? defaultView, `${path}.view`)
  };
}
function sourceString(value) {
  if (value === null)
    return "_";
  if (value.length > 0 && !/["\\\n\r]/u.test(value))
    return `"${value}"`;
  let width = 2;
  for (const match of value.matchAll(/"+/gu))
    width = Math.max(width, match[0].length + 1);
  const quote = '"'.repeat(width);
  return `${quote} ${value} ${quote}.Slice(2,-1)`;
}
function rixCelEventCommand(event, binding = "document") {
  if (event.type === "view:region")
    return `${binding} := ${binding}.SetRegion(${sourceString(event.name)}, ${event.start === null ? "_, _" : `[${event.start.join(",")}], [${event.end.join(",")}]`})`;
  if (event.type === "view:format")
    return `${binding} := ${binding}.FormatRegion([${event.start.join(",")}], [${event.end.join(",")}], ${sourceString(JSON.stringify(event.style))})`;
  if (event.type === "axis:insert")
    return `${binding} := ${binding}.InsertAxis(${event.axis}, ${event.coordinate}, ${event.count})`;
  if (event.type === "slot:set") {
    return `${binding}.SetSource(${event.index.join(", ")}, ${sourceString(event.source)}, ${sourceString(event.assignmentMode)})`;
  }
  if (event.type === "view:axis-label") {
    return `${binding}.SetAxisLabel(${event.axis}, ${event.coordinate}, ${sourceString(event.label)})`;
  }
  if (event.type === "slot:batch") {
    return `{; ${event.edits.map((edit) => rixCelEventCommand({ type: "slot:set", ...edit }, binding)).join("; ")} }`;
  }
  throw new Error(`Unsupported RiX Ripple history event type: ${event.type}`);
}
function normalizeEvent(rawEvent, offset, id, shape) {
  const path = `$.events[${offset}]`;
  const event = plainObject(rawEvent, path);
  const sequence = offset + 1;
  const type = event.type;
  if (!EVENT_TYPES.has(type))
    fail2(`${path}.type`, `is not supported: ${type}`);
  const normalized = type === "view:region" ? (() => {
    const name = regionName(event.name, `${path}.name`);
    const bounds = event.start === null && event.end === null ? { start: null, end: null } : normalizeBounds(event, shape, path);
    return { id: eventId(id, sequence), sequence, type, name, ...bounds };
  })() : type === "view:format" ? {
    id: eventId(id, sequence),
    sequence,
    type,
    ...normalizeBounds(event, shape, path),
    style: normalizeFormat(event.style, `${path}.style`)
  } : type === "axis:insert" ? (() => {
    const { axis, coordinate, count = 1 } = event;
    if (!Number.isSafeInteger(axis) || axis < 1 || axis > shape.length)
      fail2(`${path}.axis`, "is out of range");
    if (!Number.isSafeInteger(coordinate) || coordinate < 1 || coordinate > shape[axis - 1] + 1)
      fail2(`${path}.coordinate`, "is out of range");
    if (!Number.isSafeInteger(count) || count < 1 || count > 1e6)
      fail2(`${path}.count`, "must be 1..1000000");
    const next = [...shape];
    next[axis - 1] += count;
    documentShape(next);
    return { id: eventId(id, sequence), sequence, type, axis, coordinate, count };
  })() : type === "slot:set" ? {
    id: eventId(id, sequence),
    sequence,
    type,
    index: normalizeIndex3(event.index, shape, `${path}.index`),
    ...normalizeSlotDefinition(event, path)
  } : type === "slot:batch" ? (() => {
    if (!Array.isArray(event.edits) || event.edits.length < 1) {
      fail2(`${path}.edits`, "must be a non-empty array");
    }
    const occupied = new Set;
    const edits = event.edits.map((edit, editOffset) => {
      const editPath = `${path}.edits[${editOffset}]`;
      plainObject(edit, editPath);
      const index = normalizeIndex3(edit.index, shape, `${editPath}.index`);
      const key2 = indexKey(index);
      if (occupied.has(key2))
        fail2(`${editPath}.index`, "duplicates a coordinate in this batch");
      occupied.add(key2);
      return { index, ...normalizeSlotDefinition(edit, editPath) };
    });
    return { id: eventId(id, sequence), sequence, type, edits };
  })() : (() => {
    const axis = event.axis;
    const coordinate = event.coordinate;
    if (!Number.isSafeInteger(axis) || axis < 1 || axis > shape.length) {
      fail2(`${path}.axis`, `must be an integer from 1 through ${shape.length}`);
    }
    if (!Number.isSafeInteger(coordinate) || coordinate < 1 || coordinate > shape[axis - 1]) {
      fail2(`${path}.coordinate`, `must be an integer from 1 through ${shape[axis - 1]}`);
    }
    if (event.label !== null && (typeof event.label !== "string" || event.label.trim().length === 0)) {
      fail2(`${path}.label`, "must be null or a non-empty string");
    }
    return { id: eventId(id, sequence), sequence, type, axis, coordinate, label: event.label };
  })();
  if (event.id !== undefined && event.id !== normalized.id)
    fail2(`${path}.id`, `must equal "${normalized.id}"`);
  if (event.sequence !== undefined && event.sequence !== sequence)
    fail2(`${path}.sequence`, `must equal ${sequence}`);
  const command = rixCelEventCommand(normalized);
  if (event.command !== undefined && event.command !== command) {
    fail2(`${path}.command`, "must match the canonical RiX command");
  }
  return { ...normalized, command };
}
function normalizeDraft(rawDraft, offset, shape) {
  const path = `$.drafts[${offset}]`;
  const draft = plainObject(rawDraft, path);
  const index = normalizeIndex3(draft.index, shape, `${path}.index`);
  const source = draft.source;
  const assignmentMode2 = draft.assignmentMode ?? ":=";
  if (typeof source !== "string" || source.trim().length === 0)
    fail2(`${path}.source`, "must be a non-empty string");
  if (!ASSIGNMENT_MODES2.has(assignmentMode2))
    fail2(`${path}.assignmentMode`, `is not supported: ${assignmentMode2}`);
  if (draft.kind !== undefined && !["parse", "cycle", "runtime"].includes(draft.kind)) {
    fail2(`${path}.kind`, "must be parse, cycle, or runtime");
  }
  if (draft.message !== undefined && typeof draft.message !== "string")
    fail2(`${path}.message`, "must be a string");
  const normalized = {
    index,
    source,
    assignmentMode: assignmentMode2,
    kind: draft.kind ?? "runtime",
    message: draft.message ?? "Formula edit has not committed"
  };
  return { ...normalized, command: rixCelEventCommand({ type: "slot:set", ...normalized }) };
}
function denseVersionOne(input) {
  const id = documentId(input.id);
  const { shape, size } = documentShape(input.shape);
  if (!Array.isArray(input.slots))
    fail2("$.slots", "must be an array");
  if (input.slots.length !== size)
    fail2("$.slots", `must contain exactly ${size} dense slots`);
  const occupied = new Set;
  const slots = input.slots.map((rawSlot, offset) => {
    const path = `$.slots[${offset}]`;
    const slot = plainObject(rawSlot, path);
    const index = normalizeIndex3(slot.index, shape, `${path}.index`);
    const key2 = indexKey(index);
    if (occupied.has(key2))
      fail2(`${path}.index`, `duplicates coordinate [${index.join(",")}]`);
    occupied.add(key2);
    const expectedId = slotId(id, index);
    if (slot.id !== expectedId)
      fail2(`${path}.id`, `must equal "${expectedId}"`);
    return { id: expectedId, index, ...normalizeSlotDefinition(slot, path) };
  });
  slots.sort((left, right) => linearOffset(left.index, shape) - linearOffset(right.index, shape));
  return { id, shape, view: normalizeDocumentView(input.view, "$.view", shape), slots };
}
function draftToVersionOne(document) {
  const input = plainObject(document, "$");
  const format = input.format ?? input.kind;
  if (format !== RIXCEL_FORMAT)
    fail2("$.format", `must equal "${RIXCEL_FORMAT}"`);
  if (!Array.isArray(input.slots))
    fail2("$.slots", "must be an array");
  const id = documentId(input.id);
  return {
    format: RIXCEL_FORMAT,
    version: 1,
    id,
    shape: input.shape,
    view: input.view ?? {},
    slots: input.slots.map((rawSlot, offset) => {
      const slot = plainObject(rawSlot, `$.slots[${offset}]`);
      return {
        id: slot.id ?? (Array.isArray(slot.index) ? slotId(id, slot.index) : undefined),
        index: slot.index,
        source: slot.source ?? slot.code,
        assignmentMode: slot.assignmentMode ?? slot.op ?? ":=",
        view: slot.view ?? slot.style ?? {}
      };
    })
  };
}
function versionOneToVersionTwo(input) {
  const dense = denseVersionOne(input);
  const defaultSlot = normalizeSlotDefinition(undefined, "$.defaultSlot");
  const events = dense.slots.filter((slot) => JSON.stringify({ source: slot.source, assignmentMode: slot.assignmentMode, view: slot.view }) !== JSON.stringify(defaultSlot)).map((slot, offset) => normalizeEvent({
    type: "slot:set",
    index: slot.index,
    source: slot.source,
    assignmentMode: slot.assignmentMode,
    view: slot.view
  }, offset, dense.id, dense.shape));
  return {
    format: RIXCEL_FORMAT,
    version: RIXCEL_VERSION,
    id: dense.id,
    shape: dense.shape,
    view: dense.view,
    defaultSlot,
    events,
    cursor: events.length,
    drafts: []
  };
}
function parseRixCelDocument(value) {
  let input = plainObject(documentInput(value), "$");
  if (input.version === undefined || input.version === 0)
    input = draftToVersionOne(input);
  if (input.format !== RIXCEL_FORMAT)
    fail2("$.format", `must equal "${RIXCEL_FORMAT}"`);
  if (!Number.isSafeInteger(input.version))
    fail2("$.version", "must be an integer");
  if (input.version > RIXCEL_VERSION) {
    throw new Error(`Unsupported RiX Ripple document version ${input.version}; this runtime supports through version ${RIXCEL_VERSION}`);
  }
  if (input.version === 1)
    input = versionOneToVersionTwo(input);
  if (input.version === 2)
    input = { ...input, version: RIXCEL_VERSION, events: input.events?.map(({ command, ...event }) => event) };
  if (input.version !== RIXCEL_VERSION)
    fail2("$.version", `must equal ${RIXCEL_VERSION}`);
  const id = documentId(input.id);
  const { shape: initialShape } = documentShape(input.initialShape ?? input.shape);
  let runningShape = [...initialShape];
  const view = normalizeDocumentView(input.view, "$.view", initialShape);
  const defaultSlot = normalizeSlotDefinition(input.defaultSlot, "$.defaultSlot");
  if (!Array.isArray(input.events))
    fail2("$.events", "must be an array");
  if (input.events.length > 1e4)
    fail2("$.events", "exceeds 10000 history events");
  const events = input.events.map((raw, offset) => {
    const event = normalizeEvent(raw, offset, id, runningShape);
    if (event.type === "axis:insert")
      runningShape[event.axis - 1] += event.count;
    return event;
  });
  const cursor = input.cursor ?? events.length;
  if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > events.length) {
    fail2("$.cursor", `must be an integer from 0 through ${events.length}`);
  }
  const shape = historyShape(initialShape, events, cursor);
  if (JSON.stringify(shape) !== JSON.stringify(input.shape))
    fail2("$.shape", "must equal the active history shape");
  const draftsInput = input.drafts ?? [];
  if (!Array.isArray(draftsInput))
    fail2("$.drafts", "must be an array");
  const drafts = draftsInput.map((draft, offset) => normalizeDraft(draft, offset, shape));
  const draftCoordinates = new Set;
  for (const [offset, draft] of drafts.entries()) {
    const key2 = indexKey(draft.index);
    if (draftCoordinates.has(key2))
      fail2(`$.drafts[${offset}].index`, "duplicates a draft coordinate");
    draftCoordinates.add(key2);
  }
  return { format: RIXCEL_FORMAT, version: RIXCEL_VERSION, id, initialShape, shape, view, defaultSlot, events, cursor, drafts };
}
function createRixCelDocument(options = {}) {
  const shape = options.shape ?? [20, 8];
  return parseRixCelDocument({
    format: RIXCEL_FORMAT,
    version: RIXCEL_VERSION,
    id: options.id ?? "untitled",
    shape,
    view: options.view ?? {},
    defaultSlot: options.defaultSlot ?? { source: "_", assignmentMode: ":=", view: { blank: true } },
    events: [],
    cursor: 0,
    drafts: []
  });
}
function appendRixCelEvent(value, event) {
  const document = parseRixCelDocument(value);
  const events = [...document.events.slice(0, document.cursor), event];
  const shape = historyShape(document.initialShape, events, events.length);
  if (event.type === "axis:insert" && document.drafts.length)
    throw new Error("Resolve formula drafts before inserting an axis");
  const candidate = parseRixCelDocument({ ...document, shape, events, cursor: events.length, drafts: document.drafts });
  if (["axis:insert", "view:region", "view:format"].includes(event.type))
    replayRixCelDocument(candidate);
  return candidate;
}
function setRixCelCursor(value, cursor) {
  const document = parseRixCelDocument(value);
  if (document.drafts.length && document.events.slice(Math.min(cursor, document.cursor), Math.max(cursor, document.cursor)).some((event) => event.type === "axis:insert"))
    throw new Error("Resolve formula drafts before changing structural history");
  return parseRixCelDocument({ ...document, shape: historyShape(document.initialShape, document.events, cursor), cursor });
}
function setRixCelDraft(value, draft = null) {
  const document = parseRixCelDocument(value);
  if (draft === null)
    return parseRixCelDocument({ ...document, drafts: [] });
  const normalized = normalizeDraft(draft, 0, document.shape);
  const key2 = indexKey(normalized.index);
  const drafts = document.drafts.filter((item) => indexKey(item.index) !== key2);
  drafts.push(normalized);
  return parseRixCelDocument({ ...document, drafts });
}
function clearRixCelDraft(value, index) {
  const document = parseRixCelDocument(value);
  const normalized = normalizeIndex3(index, document.shape, "$.draft.index");
  const key2 = indexKey(normalized);
  return parseRixCelDocument({
    ...document,
    drafts: document.drafts.filter((item) => indexKey(item.index) !== key2)
  });
}
function historyShape(initial, events, cursor) {
  const shape = [...initial];
  for (const event of events.slice(0, cursor))
    if (event.type === "axis:insert")
      shape[event.axis - 1] += event.count ?? 1;
  return shape;
}
function rixCelSlotId(document, index, cursor = document.cursor) {
  const origin = [...index];
  for (const event of document.events.slice(0, cursor).reverse()) {
    if (event.type !== "axis:insert")
      continue;
    const axis = event.axis - 1;
    if (origin[axis] < event.coordinate)
      continue;
    if (origin[axis] < event.coordinate + event.count)
      return `${document.id}:insert:${event.sequence}:slot:${origin.join(":")}`;
    origin[axis] -= event.count;
  }
  return slotId(document.id, origin);
}
function replayRixCelDocument(value) {
  const document = parseRixCelDocument(value);
  let byIndex = new Map;
  const shape = [...document.initialShape];
  let view = jsonClone(document.view, "$.view");
  for (const event of document.events.slice(0, document.cursor)) {
    if (event.type === "slot:set") {
      byIndex.set(indexKey(event.index), {
        id: rixCelSlotId(document, event.index, event.sequence),
        index: [...event.index],
        source: event.source,
        assignmentMode: event.assignmentMode,
        view: jsonClone(event.view, `$.events[${event.sequence - 1}].view`)
      });
    } else if (event.type === "slot:batch") {
      for (const edit of event.edits) {
        byIndex.set(indexKey(edit.index), {
          id: rixCelSlotId(document, edit.index, event.sequence),
          index: [...edit.index],
          source: edit.source,
          assignmentMode: edit.assignmentMode,
          view: jsonClone(edit.view, `$.events[${event.sequence - 1}].edits.view`)
        });
      }
    } else if (event.type === "axis:insert") {
      if (tokenize(document.defaultSlot.source).some((token) => token.type === "Identifier" && ["grid", "near"].includes(token.value))) {
        throw new Error("Cannot insert with a reference-dependent implicit default formula; use explicit formula slots");
      }
      const moved = new Map;
      for (const slot of byIndex.values()) {
        const result = rewriteRixCelReferences(slot.source, { ...event, originIndex: slot.index });
        if (result.dynamic.length)
          throw new Error(`Cannot insert: dynamic reference in grid[${slot.index.join(",")}] at position ${result.dynamic[0].position}`);
        const index = [...slot.index];
        if (index[event.axis - 1] >= event.coordinate)
          index[event.axis - 1] += event.count;
        moved.set(indexKey(index), { ...slot, index, source: result.source });
      }
      byIndex = moved;
      if (view.axisLabels?.[event.axis - 1]) {
        const labels = view.axisLabels.map((labels2) => labels2 === null ? null : [...labels2]);
        labels[event.axis - 1] = labels[event.axis - 1].slice(0, event.coordinate - 1).concat(Array(event.count).fill(null), labels[event.axis - 1].slice(event.coordinate - 1));
        view = { ...view, axisLabels: labels };
      }
      if (view.slice?.[event.axis - 1] >= event.coordinate) {
        view = { ...view, slice: [...view.slice] };
        view.slice[event.axis - 1] += event.count;
      }
      const moveBounds = (bounds) => {
        const start = [...bounds.start], end = [...bounds.end], axis = event.axis - 1;
        if (start[axis] >= event.coordinate)
          start[axis] += event.count;
        if (end[axis] >= event.coordinate)
          end[axis] += event.count;
        return { ...bounds, start, end };
      };
      if (view.regions)
        view.regions = Object.fromEntries(Object.entries(view.regions).map(([name, bounds]) => [name, moveBounds(bounds)]));
      if (view.formats)
        view.formats = view.formats.map(moveBounds);
      shape[event.axis - 1] += event.count;
    } else if (event.type === "view:region") {
      view.regions = { ...view.regions };
      if (event.start === null)
        delete view.regions[event.name];
      else
        Object.defineProperty(view.regions, event.name, { value: { start: [...event.start], end: [...event.end] }, enumerable: true, configurable: true, writable: true });
    } else if (event.type === "view:format") {
      view.formats = [...view.formats ?? [], { start: [...event.start], end: [...event.end], style: { ...event.style } }];
    } else if (event.type === "view:axis-label") {
      const labels = Array.from({ length: document.shape.length }, (_unused, axis) => {
        const existing = view.axisLabels?.[axis];
        return existing === null || existing === undefined ? Array(shape[axis]).fill(null) : [...existing];
      });
      labels[event.axis - 1][event.coordinate - 1] = event.label;
      view = { ...view, axisLabels: labels.map((axisLabels) => axisLabels.every((label) => label === null) ? null : axisLabels) };
    }
  }
  return {
    document,
    view: normalizeDocumentView(view, "$.view", document.shape),
    slots: [...byIndex.values()].sort((left, right) => linearOffset(left.index, document.shape) - linearOffset(right.index, document.shape))
  };
}
function exportRixCelDocument(sheet) {
  if (!isFormulaSheet(sheet))
    throw new Error("RiX Ripple export requires a FormulaSheet");
  let document = importedDocuments.get(sheet) ?? createRixCelDocument({
    id: sheet.id,
    shape: [...sheet.shape],
    view: jsonClone(sheet.documentView ?? {}, "$.view"),
    defaultSlot: sheet.defaultSlotDefinition ?? { source: "_", assignmentMode: ":=", view: {} }
  });
  const previous = replayRixCelDocument(document);
  const previousSlots = new Map(previous.slots.map((slot) => [indexKey(slot.index), slot]));
  for (const slot of sheet.materializedSlots()) {
    const index = [...slot.index];
    if (typeof slot.source !== "string")
      throw new Error(`RiX Ripple export requires source for grid[${index.join(",")}]`);
    const current = { source: slot.source, assignmentMode: slot.assignmentMode, view: slot.view ?? {} };
    const old = previousSlots.get(indexKey(index)) ?? document.defaultSlot;
    if (JSON.stringify(current) !== JSON.stringify({ source: old.source, assignmentMode: old.assignmentMode, view: old.view })) {
      document = appendRixCelEvent(document, { type: "slot:set", index, ...current });
    }
  }
  const currentView = normalizeDocumentView(sheet.documentView ?? {}, "$.view", [...sheet.shape]);
  for (let axis = 0;axis < document.shape.length; axis++) {
    const labels = currentView.axisLabels?.[axis];
    const old = previous.view.axisLabels?.[axis];
    if (!labels && !old)
      continue;
    for (let coordinate = 1;coordinate <= document.shape[axis]; coordinate++)
      if ((labels?.[coordinate - 1] ?? null) !== (old?.[coordinate - 1] ?? null)) {
        document = appendRixCelEvent(document, { type: "view:axis-label", axis: axis + 1, coordinate, label: labels?.[coordinate - 1] ?? null });
      }
  }
  importedDocuments.set(sheet, document);
  return document;
}
function stringifyRixCelDocument(value, options = {}) {
  const document = isFormulaSheet(value) ? exportRixCelDocument(value) : parseRixCelDocument(value);
  const space = options.space ?? 2;
  if (!Number.isInteger(space) || space < 0 || space > 10) {
    throw new Error("RiX Ripple JSON indentation must be an integer from 0 through 10");
  }
  return JSON.stringify(document, null, space);
}
function importRixCelDocument(value, options = {}) {
  const { document, view, slots } = replayRixCelDocument(value);
  if (typeof options.compileFormula !== "function")
    throw new Error("RiX Ripple import requires a formula compiler");
  if (typeof options.runFormula !== "function")
    throw new Error("RiX Ripple import requires a deferred formula evaluator");
  let defaultFormula;
  try {
    defaultFormula = options.compileFormula(document.defaultSlot.source);
  } catch (error) {
    throw new Error(`RiX Ripple default slot source did not compile: ${error.message}`);
  }
  const entries2 = slots.map((slot) => {
    try {
      return { index: slot.index, formula: options.compileFormula(slot.source) };
    } catch (error) {
      throw new Error(`RiX Ripple source for grid[${slot.index.join(",")}] did not compile: ${error.message}`);
    }
  });
  const slotMetadata = new Map(slots.map((slot) => [indexKey(slot.index), {
    id: slot.id,
    source: slot.source,
    assignmentMode: slot.assignmentMode,
    view: slot.view
  }]));
  const sheet = createFormulaSheet({
    type: "sparse_formula_grid",
    shape: document.shape,
    entries: entries2,
    defaultFormula
  }, {
    ...options,
    id: document.id,
    documentView: view,
    defaultSlotMetadata: document.defaultSlot,
    slotMetadata,
    slotIdentity: (index) => rixCelSlotId(document, index)
  });
  importedDocuments.set(sheet, document);
  return sheet;
}

// ../../rix/src/runtime/decision.js
var UNDECIDED = Object.freeze({
  __rix_undecided__: true,
  toJSON() {
    return { $rix: "Undecided" };
  }
});

class UndecidedDiagnostic {
  constructor(reason, details = null) {
    this.__rix_undecided__ = true;
    this.reason = String(reason || "undecided");
    this.details = details;
    this._ext = new Map([
      ["reason", { type: "string", value: this.reason }],
      ...details === null ? [] : [["details", details]]
    ]);
  }
  toJSON() {
    return { $rix: "Undecided", reason: this.reason, details: this.details };
  }
  copy() {
    return new UndecidedDiagnostic(this.reason, this.details);
  }
}
var undecidedDiagnostic = (reason, details = null) => new UndecidedDiagnostic(reason, details);
var isUndecided = (value) => value === UNDECIDED || value instanceof UndecidedDiagnostic;
function decisionState(value) {
  if (isHole(value) || value === undefined) {
    throw new Error("Missing data cannot be used as a decision");
  }
  if (value === null)
    return "null";
  if (isUndecided(value))
    return "undecided";
  return "truth";
}

// ../../rix/src/runtime/operational-fault.js
class OperationalFault extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "OperationalFault";
    this.kind = "fault";
    this.code = options.code || "OPERATIONAL_FAULT";
    this.data = options.data ?? null;
  }
}

class TimeoutFault extends OperationalFault {
  constructor(timeoutSeconds, options = {}) {
    super(`Async scope timed out after ${timeoutSeconds} seconds`, {
      ...options,
      code: "ASYNC_TIMEOUT",
      data: options.data ?? { timeoutSeconds }
    });
    this.name = "TimeoutFault";
    this.timeoutSeconds = timeoutSeconds;
  }
}

class CleanupGraceFault extends OperationalFault {
  constructor(graceMs, options = {}) {
    super(`Async cleanup exceeded its ${graceMs}ms grace period`, {
      ...options,
      code: "ASYNC_CLEANUP_GRACE_EXCEEDED",
      data: options.data ?? { graceMs }
    });
    this.name = "CleanupGraceFault";
    this.graceMs = graceMs;
  }
}
function isOperationalFault(error) {
  return error instanceof OperationalFault || error?.kind === "fault";
}
function dataToRixValue(value, seen = new WeakSet) {
  if (value === null || value === undefined)
    return null;
  if (value instanceof Integer || value?.type)
    return value;
  if (typeof value === "string")
    return { type: "string", value };
  if (typeof value === "boolean")
    return new Integer(value ? 1n : 0n);
  if (typeof value === "bigint")
    return new Integer(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return new Integer(BigInt(value));
  }
  if (Array.isArray(value)) {
    if (seen.has(value))
      return { type: "string", value: "[circular]" };
    seen.add(value);
    return { type: "sequence", values: value.map((entry) => dataToRixValue(entry, seen)) };
  }
  if (typeof value === "object") {
    if (seen.has(value))
      return { type: "string", value: "[circular]" };
    seen.add(value);
    return {
      type: "map",
      entries: new Map(Object.entries(value).map(([key2, entry]) => [
        key2,
        dataToRixValue(entry, seen)
      ]))
    };
  }
  return { type: "string", value: String(value) };
}
function faultToRixValue(error) {
  const entries2 = new Map([
    ["code", { type: "string", value: error?.code || "OPERATIONAL_FAULT" }],
    ["message", { type: "string", value: error?.message || "Operational fault" }]
  ]);
  if (error instanceof TimeoutFault || Number.isFinite(error?.timeoutSeconds)) {
    entries2.set("timeout", new Integer(BigInt(Math.trunc(error.timeoutSeconds))));
  }
  if (error?.data !== null && error?.data !== undefined) {
    entries2.set("data", dataToRixValue(error.data));
  }
  return { type: "map", entries: entries2 };
}

// ../../rix/src/runtime/async-policy.js
var ASYNC_LIMITS = Object.freeze({
  concurrency: 64,
  queued: 4096,
  outstanding: 4096,
  background: 128,
  errors: 64,
  outputItems: 1e4,
  traceEvents: 2048,
  branchRecords: 4096
});
function asyncLimits(input = {}) {
  const result = {};
  for (const [key2, ceiling] of Object.entries(ASYNC_LIMITS)) {
    const value = input?.[key2] ?? ceiling;
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error(`Async ${key2} limit must be a positive safe integer`);
    result[key2] = Math.min(value, ceiling);
  }
  return Object.freeze(result);
}
function asyncLimitFault(resource, limit) {
  return new OperationalFault(`Async ${resource} limit of ${limit} exceeded`, {
    code: "ASYNC_LIMIT_EXCEEDED",
    data: { resource, limit }
  });
}
function capabilityAsyncPolicy(definition = {}) {
  const effect = definition.effect ?? (definition.pure === true ? "pure" : "unknown");
  const concurrency = definition.concurrency ?? (effect === "pure" ? "safe" : "serial");
  const cancellation = definition.cancellation ?? "none";
  if (!["pure", "read", "write", "unknown"].includes(effect))
    throw new Error(`Invalid capability effect: ${effect}`);
  if (!["safe", "serial"].includes(concurrency))
    throw new Error(`Invalid capability concurrency: ${concurrency}`);
  if (!["none", "cooperative"].includes(cancellation))
    throw new Error(`Invalid capability cancellation: ${cancellation}`);
  return { effect, concurrency, cancellation };
}
function normalizeAsyncFailure(value) {
  if (value && typeof value === "object" && Object.isExtensible(value))
    return value;
  const error = new Error(value?.message ?? String(value), { cause: value });
  for (const key2 of ["kind", "code", "data", "asyncTaskPath", "asyncTaskSegments"]) {
    if (value?.[key2] !== undefined)
      error[key2] = value[key2];
  }
  return error;
}
function appendAsyncFailures(primary, errors, limit = ASYNC_LIMITS.errors) {
  primary = normalizeAsyncFailure(primary);
  const existing = Array.isArray(primary.suppressed) ? primary.suppressed : [];
  const incoming = errors.filter((error) => error !== primary).map(normalizeAsyncFailure);
  const combined = [...existing, ...incoming];
  primary.suppressed = combined.slice(0, limit);
  const dropped = Math.max(0, combined.length - limit);
  if (dropped)
    primary.asyncDroppedErrors = (primary.asyncDroppedErrors || 0) + dropped;
  return primary;
}

// ../../rix/src/runtime/lazy-sequence.js
function isLazySequence(value) {
  return Boolean(value && value.type === "lazy_sequence" && value._lazy);
}
function createLazySequence(options) {
  for (const [key2, fallback] of [["maxCache", ASYNC_LIMITS.outputItems], ["maxPending", ASYNC_LIMITS.queued]]) {
    if (!Number.isSafeInteger(options[key2] ?? fallback) || (options[key2] ?? fallback) < 1)
      throw new Error(`Lazy ${key2} must be a positive safe integer`);
  }
  if ((options.cache?.length || 0) > Math.min(options.maxCache ?? ASYNC_LIMITS.outputItems, ASYNC_LIMITS.outputItems))
    throw asyncLimitFault("lazy cache", options.maxCache ?? ASYNC_LIMITS.outputItems);
  const sequence = {
    type: "lazy_sequence",
    _lazy: {
      state: options.createState(),
      initialState: options.createState,
      cloneState: options.cloneState || ((state) => ({ ...state })),
      pull: options.pull,
      pullAsync: options.pullAsync || null,
      pending: null,
      pendingCount: 0,
      maxPending: Math.min(options.maxPending ?? ASYNC_LIMITS.queued, ASYNC_LIMITS.queued),
      maxCache: Math.min(options.maxCache ?? ASYNC_LIMITS.outputItems, ASYNC_LIMITS.outputItems),
      cache: options.cache ? options.cache.map(requireConcreteLazyValue) : [],
      done: false,
      unresolved: null,
      knownLength: options.knownLength ?? null,
      maxIterations: options.maxIterations ?? 1e4,
      label: options.label || "generator"
    },
    _ext: options.ext ? new Map(options.ext) : new Map
  };
  return sequence;
}
function lazyKnownLength(sequence) {
  if (!isLazySequence(sequence))
    return null;
  if (sequence._lazy.done)
    return sequence._lazy.cache.length;
  return sequence._lazy.knownLength;
}
function isThenable(value) {
  return value && typeof value.then === "function";
}
function requireConcreteLazyValue(value) {
  if (isThenable(value)) {
    Promise.resolve(value).catch(() => {});
    throw new Error("Async recurrence requires promise-aware evaluation; promises cannot enter a lazy cache");
  }
  return value;
}
function preparePull(lazy) {
  if (lazy.done)
    return false;
  if (lazy.knownLength !== null && lazy.cache.length >= lazy.knownLength) {
    lazy.done = true;
    return false;
  }
  if (lazy.cache.length >= lazy.maxCache)
    throw asyncLimitFault("lazy cache", lazy.maxCache);
  return true;
}
function commitPull(lazy, state, result, budget) {
  result = requireConcreteLazyValue(result) || { done: true };
  requireConcreteLazyValue(result.value);
  requireConcreteLazyValue(result.unresolved);
  const attempts = result.attempts ?? (result.done ? 0 : 1);
  if (attempts > budget)
    throw new Error(`${lazy.label} exceeded the iteration limit of ${budget} while producing one value`);
  lazy.state = state;
  if (result.unresolved !== undefined) {
    lazy.unresolved = result.unresolved;
    lazy.done = true;
    lazy.knownLength = null;
    return { done: true, unresolved: result.unresolved, attempts };
  }
  if (result.done) {
    lazy.done = true;
    lazy.knownLength = lazy.cache.length;
    return { done: true, attempts };
  }
  lazy.cache.push(result.value);
  return { done: false, value: result.value, attempts };
}
function pullLazyValue(sequence, iterationBudget = null) {
  if (!isLazySequence(sequence))
    throw new Error("Expected a lazy sequence");
  const lazy = sequence._lazy;
  if (!preparePull(lazy))
    return { done: true, attempts: 0 };
  if (lazy.pullAsync || lazy.pending)
    throw new Error("Async recurrence requires promise-aware evaluation");
  const budget = iterationBudget ?? lazy.maxIterations;
  const state = lazy.cloneState(lazy.state);
  return commitPull(lazy, state, lazy.pull(state, sequence, budget), budget);
}
async function pullAsync(sequence, iterationBudget, signal) {
  const lazy = sequence._lazy;
  if (signal?.aborted)
    throw signal.reason;
  if (!preparePull(lazy))
    return { done: true, attempts: 0 };
  const budget = iterationBudget ?? lazy.maxIterations;
  const state = lazy.cloneState(lazy.state);
  const result = await (lazy.pullAsync || lazy.pull)(state, sequence, budget, signal);
  if (signal?.aborted)
    throw signal.reason;
  return commitPull(lazy, state, result, budget);
}
function lockedLazy(sequence, callback) {
  const lazy = sequence._lazy;
  if (lazy.pendingCount >= lazy.maxPending)
    return Promise.reject(asyncLimitFault("lazy pull queue", lazy.maxPending));
  lazy.pendingCount++;
  const operation = (lazy.pending || Promise.resolve()).then(callback);
  const settled = operation.then(() => {
    lazy.pendingCount--;
  }, () => {
    lazy.pendingCount--;
  });
  lazy.pending = settled;
  settled.then(() => {
    if (lazy.pending === settled)
      lazy.pending = null;
  });
  return operation;
}
async function materializeLazySequenceAsync(sequence, options = {}) {
  if (!isLazySequence(sequence))
    return sequence;
  const lazy = sequence._lazy;
  if (lazy.knownLength === null && options.allowUnknown !== true && !lazy.done)
    throw new Error(`Cannot materialize unbounded or predicate-bounded ${lazy.label} without an explicit bound`);
  return lockedLazy(sequence, async () => {
    const limit = options.maxIterations ?? lazy.maxIterations;
    let attempts = 0;
    while (!lazy.done) {
      const result = await pullAsync(sequence, Math.max(0, limit - attempts), options.signal);
      attempts += result.attempts || 0;
    }
    return lazy.unresolved ?? { type: "sequence", values: [...lazy.cache], _ext: new Map([["_mutable", 1]]) };
  });
}
function ensureLazyIndex(sequence, oneBasedIndex) {
  if (!Number.isInteger(oneBasedIndex) || oneBasedIndex < 1) {
    throw new Error("Lazy sequence index must be a positive integer");
  }
  while (sequence._lazy.cache.length < oneBasedIndex && !sequence._lazy.done) {
    pullLazyValue(sequence);
  }
  if (sequence._lazy.unresolved !== null)
    return sequence._lazy.unresolved;
  return sequence._lazy.cache[oneBasedIndex - 1] ?? null;
}
function materializeLazySequence(sequence, options = {}) {
  if (!isLazySequence(sequence))
    return sequence;
  const lazy = sequence._lazy;
  if (lazy.knownLength === null && options.allowUnknown !== true && !lazy.done) {
    throw new Error(`Cannot materialize unbounded or predicate-bounded ${lazy.label} without an explicit bound`);
  }
  const limit = options.maxIterations ?? lazy.maxIterations;
  let attempts = 0;
  while (!lazy.done) {
    const result = pullLazyValue(sequence, Math.max(0, limit - attempts));
    attempts += result.attempts || 0;
    if (attempts > limit) {
      throw new Error(`${lazy.label} exceeded the iteration limit of ${limit} while materializing`);
    }
  }
  if (lazy.unresolved !== null)
    return lazy.unresolved;
  return { type: "sequence", values: [...lazy.cache], _ext: new Map([["_mutable", 1]]) };
}
function cloneLazySequence(sequence, options = {}) {
  if (!isLazySequence(sequence))
    return sequence;
  const source = sequence._lazy;
  const restart = options.restart === true;
  const cloneValue = options.cloneValue || ((value) => value);
  const clone = {
    type: "lazy_sequence",
    _lazy: {
      state: restart ? source.initialState({ cloneValue, restart: true }) : source.cloneState(source.state, { cloneValue }),
      initialState: source.initialState,
      cloneState: source.cloneState,
      pull: source.pull,
      pullAsync: source.pullAsync,
      pending: null,
      pendingCount: 0,
      maxPending: source.maxPending,
      maxCache: source.maxCache,
      cache: restart ? [] : source.cache.map(cloneValue),
      done: restart ? false : source.done,
      unresolved: restart ? null : source.unresolved,
      knownLength: source.knownLength,
      maxIterations: source.maxIterations,
      label: source.label
    },
    _ext: sequence._ext ? new Map(sequence._ext) : new Map
  };
  return clone;
}
function mapLazySequence(source, mapper, options = {}) {
  let mapped;
  mapped = createLazySequence({
    createState: ({ cloneValue, restart } = {}) => ({
      index: 0,
      source: restart ? cloneLazySequence(source, { restart: true, cloneValue }) : source
    }),
    cloneState: (state, { cloneValue } = {}) => ({
      index: state.index,
      source: cloneLazySequence(state.source, { cloneValue })
    }),
    knownLength: lazyKnownLength(source),
    maxIterations: source._lazy.maxIterations,
    label: options.label || "lazy map",
    pull(state) {
      state.index++;
      const value = ensureLazyIndex(state.source, state.index);
      if (value === null && state.source._lazy.done && state.source._lazy.cache.length < state.index) {
        return { done: true };
      }
      return { done: false, value: mapper(value, state.index, state.source, mapped), attempts: 1 };
    }
  });
  return mapped;
}
function filterLazySequence(source, predicate, options = {}) {
  let filtered;
  filtered = createLazySequence({
    createState: ({ cloneValue, restart } = {}) => ({
      sourceIndex: 0,
      source: restart ? cloneLazySequence(source, { restart: true, cloneValue }) : source
    }),
    cloneState: (state, { cloneValue } = {}) => ({
      sourceIndex: state.sourceIndex,
      source: cloneLazySequence(state.source, { cloneValue })
    }),
    knownLength: null,
    maxIterations: source._lazy.maxIterations,
    label: options.label || "lazy filter",
    pull(state, _self, budget) {
      let attempts = 0;
      while (attempts < budget) {
        state.sourceIndex++;
        attempts++;
        const value = ensureLazyIndex(state.source, state.sourceIndex);
        if (value === null && state.source._lazy.done && state.source._lazy.cache.length < state.sourceIndex) {
          return { done: true, attempts };
        }
        const decision = requireConcreteLazyValue(predicate(value, state.sourceIndex, state.source, filtered));
        if (options.isUnresolved?.(decision)) {
          return { unresolved: decision, attempts };
        }
        if (decision) {
          return { done: false, value, attempts };
        }
      }
      return { attempts: budget + 1 };
    }
  });
  return filtered;
}

// ../../rix/src/runtime/cell.js
class Cell {
  constructor(value) {
    this.value = value;
  }
}
function classifyMetaKey(name) {
  if (name.startsWith("__"))
    return "sticky";
  if (name.startsWith("_"))
    return "ephemeral";
  return "ordinary";
}
function shallowCopyValue(value) {
  if (value == null)
    return value;
  if (typeof value !== "object")
    return value;
  if (value instanceof UndecidedDiagnostic)
    return value.copy();
  if (isUndecided(value))
    return value;
  if (value instanceof CertifiedApproximation)
    return value.copy();
  if (value instanceof Integer)
    return new Integer(value.value);
  if (value instanceof Rational)
    return new Rational(value.numerator, value.denominator);
  if (value instanceof RationalInterval) {
    return new RationalInterval(new Rational(value.start.numerator, value.start.denominator), new Rational(value.end.numerator, value.end.denominator));
  }
  if (value instanceof RationalIntervalSet)
    return new RationalIntervalSet(value);
  if (value.type === "string")
    return { type: "string", value: value.value };
  if (isLazySequence(value))
    return cloneLazySequence(value);
  if (value.type === "iterator") {
    return {
      type: "iterator",
      source: value.source,
      cursor: value.cursor,
      _ext: value._ext ? new Map(value._ext) : undefined
    };
  }
  if (value.type === "sequence") {
    return {
      type: "sequence",
      values: [...value.values],
      _ext: value._ext ? new Map(value._ext) : undefined
    };
  }
  if (value.type === "tuple") {
    return {
      type: "tuple",
      values: [...value.values],
      _ext: value._ext ? new Map(value._ext) : undefined
    };
  }
  if (value.type === "map" && value.entries instanceof Map) {
    return {
      type: "map",
      entries: new Map(value.entries),
      _ext: value._ext ? new Map(value._ext) : undefined
    };
  }
  if (value.type === "export_bundle" && value.entries instanceof Map) {
    return {
      type: "export_bundle",
      entries: new Map(value.entries),
      _ext: value._ext ? new Map(value._ext) : undefined
    };
  }
  if (value.type === "set") {
    return {
      type: "set",
      values: [...value.values],
      _ext: value._ext ? new Map(value._ext) : undefined
    };
  }
  if (isShaped(value)) {
    return {
      type: "shaped",
      data: [...value.data],
      shape: [...value.shape],
      strides: [...value.strides],
      offset: value.offset,
      _ext: value._ext ? new Map(value._ext) : undefined
    };
  }
  if (value.type === "quantity") {
    return { ...value, _ext: value._ext ? new Map(value._ext) : undefined };
  }
  if (value.type === "unit_expr") {
    return { ...value, factors: new Map(value.factors), _ext: value._ext ? new Map(value._ext) : undefined };
  }
  if (value.type === "exact_expression") {
    return { ...value, terms: new Map(value.terms), _ext: value._ext ? new Map(value._ext) : undefined };
  }
  if (value.type === "cayley") {
    return { ...value, _ext: value._ext ? new Map(value._ext) : undefined };
  }
  return value;
}
function deepCopyValue(value, memo = new WeakMap) {
  if (!(memo instanceof WeakMap))
    memo = new WeakMap;
  if (value == null)
    return value;
  if (typeof value !== "object")
    return value;
  if (memo.has(value))
    return memo.get(value);
  if (value instanceof UndecidedDiagnostic) {
    const copy = value.copy();
    memo.set(value, copy);
    return copy;
  }
  if (isUndecided(value))
    return value;
  if (value instanceof CertifiedApproximation) {
    const copy = value.copy();
    memo.set(value, copy);
    return copy;
  }
  if (value instanceof Integer) {
    const copy = new Integer(value.value);
    memo.set(value, copy);
    return copy;
  }
  if (value instanceof Rational) {
    const copy = new Rational(value.numerator, value.denominator);
    memo.set(value, copy);
    return copy;
  }
  if (value instanceof RationalInterval) {
    const copy = new RationalInterval(new Rational(value.start.numerator, value.start.denominator), new Rational(value.end.numerator, value.end.denominator));
    memo.set(value, copy);
    return copy;
  }
  if (value instanceof RationalIntervalSet) {
    const copy = new RationalIntervalSet(value);
    memo.set(value, copy);
    return copy;
  }
  if (value.type === "string") {
    const copy = { type: "string", value: value.value };
    memo.set(value, copy);
    return copy;
  }
  if (isLazySequence(value)) {
    const copy = cloneLazySequence(value, {
      restart: true,
      cloneValue: (child) => deepCopyValue(child, memo)
    });
    memo.set(value, copy);
    return copy;
  }
  if (value.type === "iterator") {
    const copy = {
      type: "iterator",
      source: undefined,
      cursor: value.cursor,
      _ext: undefined
    };
    memo.set(value, copy);
    copy.source = deepCopyValue(value.source, memo);
    copy._ext = value._ext ? deepCopyMeta(value._ext, memo) : undefined;
    return copy;
  }
  if (value.type === "sequence") {
    const copy = {
      type: "sequence",
      values: [],
      _ext: undefined
    };
    memo.set(value, copy);
    copy.values = value.values.map((child) => deepCopyValue(child, memo));
    copy._ext = value._ext ? deepCopyMeta(value._ext, memo) : undefined;
    return copy;
  }
  if (value.type === "tuple") {
    const copy = {
      type: "tuple",
      values: [],
      _ext: undefined
    };
    memo.set(value, copy);
    copy.values = value.values.map((child) => deepCopyValue(child, memo));
    copy._ext = value._ext ? deepCopyMeta(value._ext, memo) : undefined;
    return copy;
  }
  if (value.type === "map" && value.entries instanceof Map) {
    const copy = {
      type: "map",
      entries: new Map,
      _ext: undefined
    };
    memo.set(value, copy);
    for (const [k, v] of value.entries) {
      copy.entries.set(k, deepCopyValue(v, memo));
    }
    copy._ext = value._ext ? deepCopyMeta(value._ext, memo) : undefined;
    return copy;
  }
  if (value.type === "export_bundle" && value.entries instanceof Map) {
    const copy = {
      type: "export_bundle",
      entries: new Map,
      _ext: undefined
    };
    memo.set(value, copy);
    for (const [k, v] of value.entries) {
      copy.entries.set(k, deepCopyCell(v, memo));
    }
    copy._ext = value._ext ? deepCopyMeta(value._ext, memo) : undefined;
    return copy;
  }
  if (value.type === "set") {
    const copy = {
      type: "set",
      values: [],
      _ext: undefined
    };
    memo.set(value, copy);
    copy.values = value.values.map((child) => deepCopyValue(child, memo));
    copy._ext = value._ext ? deepCopyMeta(value._ext, memo) : undefined;
    return copy;
  }
  if (isShaped(value)) {
    const copy = {
      type: "shaped",
      data: [],
      shape: [...value.shape],
      strides: [...value.strides],
      offset: value.offset,
      _ext: undefined
    };
    memo.set(value, copy);
    copy.data = value.data.map((child) => deepCopyValue(child, memo));
    copy._ext = value._ext ? deepCopyMeta(value._ext, memo) : undefined;
    return copy;
  }
  if (value.type === "quantity") {
    const copy = {
      ...value,
      baseMagnitude: undefined,
      displayUnit: undefined,
      _ext: undefined
    };
    memo.set(value, copy);
    copy.baseMagnitude = deepCopyValue(value.baseMagnitude, memo);
    copy.displayUnit = deepCopyValue(value.displayUnit, memo);
    copy._ext = value._ext ? deepCopyMeta(value._ext, memo) : undefined;
    return copy;
  }
  if (value.type === "unit_expr") {
    const copy = {
      ...value,
      factors: new Map(value.factors),
      _ext: undefined
    };
    memo.set(value, copy);
    copy._ext = value._ext ? deepCopyMeta(value._ext, memo) : undefined;
    return copy;
  }
  if (value.type === "exact_expression") {
    const copy = { ...value, terms: new Map, _ext: undefined };
    memo.set(value, copy);
    for (const [key2, term] of value.terms) {
      copy.terms.set(key2, {
        powers: new Map(term.powers),
        coefficient: deepCopyValue(term.coefficient, memo)
      });
    }
    copy._ext = value._ext ? deepCopyMeta(value._ext, memo) : undefined;
    return copy;
  }
  if (value.type === "cayley") {
    const copy = {
      ...value,
      magnitude: undefined,
      direction: undefined,
      _ext: undefined
    };
    memo.set(value, copy);
    copy.magnitude = deepCopyValue(value.magnitude, memo);
    copy.direction = deepCopyValue(value.direction, memo);
    copy._ext = value._ext ? deepCopyMeta(value._ext, memo) : undefined;
    return copy;
  }
  memo.set(value, value);
  return value;
}
function deepCopyMeta(meta, memo) {
  if (memo.has(meta))
    return memo.get(meta);
  const result = new Map;
  memo.set(meta, result);
  for (const [key2, val] of meta) {
    result.set(key2, deepCopyValue(val, memo));
  }
  return result;
}
function deepCopyCell(cell, memo) {
  if (memo.has(cell))
    return memo.get(cell);
  const result = new Cell(undefined);
  memo.set(cell, result);
  result.value = deepCopyValue(cell.value, memo);
  return result;
}
function ensureExt(obj) {
  if (!obj || typeof obj !== "object") {
    throw new Error(`Cannot attach meta properties to ${typeof obj}`);
  }
  if (!obj._ext) {
    obj._ext = new Map;
  }
  return obj._ext;
}
function copyAllMeta(source, target, depth) {
  const srcMeta = source?._ext;
  if (!srcMeta || srcMeta.size === 0)
    return;
  if (!target || typeof target !== "object")
    return;
  const tgtMeta = ensureExt(target);
  for (const [key2, val] of srcMeta) {
    tgtMeta.set(key2, depth === "deep" ? deepCopyValue(val) : val);
  }
}
function transferMetaForUpdate(oldValue, newValue, rhsValue, depth) {
  if (!newValue || typeof newValue !== "object")
    return;
  const oldMeta = oldValue?._ext;
  const rhsMeta = rhsValue?._ext;
  if (!oldMeta && !rhsMeta)
    return;
  const tgtMeta = new Map;
  newValue._ext = tgtMeta;
  const copyVal = depth === "deep" ? deepCopyValue : (v) => v;
  if (oldMeta) {
    for (const [key2, val] of oldMeta) {
      if (classifyMetaKey(key2) === "ordinary") {
        tgtMeta.set(key2, copyVal(val));
      }
    }
  }
  if (oldMeta) {
    for (const [key2, val] of oldMeta) {
      if (classifyMetaKey(key2) === "sticky") {
        tgtMeta.set(key2, copyVal(val));
      }
    }
  }
  if (rhsMeta) {
    for (const [key2, val] of rhsMeta) {
      if (classifyMetaKey(key2) === "sticky") {
        tgtMeta.set(key2, copyVal(val));
      }
    }
  }
  if (rhsMeta) {
    for (const [key2, val] of rhsMeta) {
      if (classifyMetaKey(key2) === "ephemeral") {
        tgtMeta.set(key2, copyVal(val));
      }
    }
  }
}

// ../../rix/src/runtime/refinement.js
var REFINEMENT_REQUEST_SCHEMA = "rix.numerics.refinement-request@1";
var REFINEMENT_RESULT_SCHEMA = "rix.numerics.enclosure@1";
var REFINEMENT_CAPABILITIES_SCHEMA = "rix.numerics.capabilities@1";
var OPERATIONS = new Set(["enclose", "refine", "sample"]);
var STATUSES = new Set([
  "enclosed",
  "approximate",
  "goalNotMet",
  "budgetExhausted",
  "resolutionFloor",
  "unsupported",
  "unknown"
]);
var LIMIT_KEYS = ["maxwork", "maxcalls", "maxiterations", "maxdepth", "timeout", "memory"];
var EVIDENCE_RANK = new Map([
  ["approximate", 0],
  ["observed", 1],
  ["assumed", 2],
  ["constructorGuarantee", 3],
  ["proof", 4]
]);
var refinementText = (value) => ({ type: "string", value: String(value) });
var refinementMap = (entries2 = []) => ({ type: "map", entries: new Map(entries2) });
var refinementSequence = (values = []) => ({ type: "sequence", values });
function refinementEntry(value, key2, fallback = null) {
  if (!(value?.type === "map" && value.entries instanceof Map))
    return fallback;
  const wanted = String(key2).toLowerCase();
  for (const [candidate, item] of value.entries) {
    if (String(candidate).toLowerCase() === wanted)
      return item;
  }
  return fallback;
}
function nameOf(value, fallback = null) {
  if (value === null || value === undefined)
    return fallback;
  if (value?.type === "string")
    return value.value;
  return String(value);
}
function asRational3(value, label, { positive = false } = {}) {
  const rational2 = value instanceof Integer ? value.toRational() : value;
  if (!(rational2 instanceof Rational))
    throw new TypeError(`${label} must be an exact Integer or Rational`);
  if (positive && !rational2.greaterThan(Rational.zero))
    throw new RangeError(`${label} must be positive`);
  return rational2;
}
function asNonnegativeInteger(value, label) {
  if (!(value instanceof Integer) || value.value < 0n)
    throw new RangeError(`${label} must be a nonnegative Integer`);
  return value;
}
function truth(value) {
  return value !== null && value !== undefined;
}
function bool(value) {
  return value ? new Integer(1n) : null;
}
function option(map, key2, fallback) {
  if (arguments.length < 3)
    fallback = null;
  if (!(map?.type === "map" && map.entries instanceof Map))
    return fallback;
  const wanted = String(key2).toLowerCase();
  for (const [candidate, value] of map.entries) {
    if (String(candidate).toLowerCase() === wanted)
      return value;
  }
  return fallback;
}
function exactLessThanOrEqual(left, right) {
  const a = left instanceof Integer ? left.toRational() : left;
  const b = right instanceof Integer ? right.toRational() : right;
  if (!(a instanceof Rational) || !(b instanceof Rational))
    return null;
  return a.lessThanOrEqual(b);
}
function restrictiveLimit(requested, provider) {
  if (requested === null || requested === undefined)
    return provider ?? null;
  if (provider === null || provider === undefined)
    return requested;
  const comparison = exactLessThanOrEqual(requested, provider);
  return comparison === null || comparison ? requested : provider;
}
function normalizeLimitKey(key2) {
  const normalized = String(key2).toLowerCase();
  return normalized === "maxmemory" ? "memory" : normalized;
}
function providerLimits(capabilities) {
  const found = new Map;
  if (!(capabilities?.type === "map" && capabilities.entries instanceof Map))
    return found;
  for (const [key2, value] of capabilities.entries) {
    const normalized = normalizeLimitKey(key2);
    if (LIMIT_KEYS.includes(normalized))
      found.set(normalized, value);
  }
  for (const container of ["limits", "work"]) {
    const nested = refinementEntry(capabilities, container, null);
    if (!(nested?.type === "map" && nested.entries instanceof Map))
      continue;
    for (const [key2, value] of nested.entries) {
      const normalized = normalizeLimitKey(key2);
      if (LIMIT_KEYS.includes(normalized))
        found.set(normalized, value);
    }
  }
  return found;
}
function requestedLimits(options) {
  const found = new Map;
  const work = option(options, "work", null);
  for (const key2 of LIMIT_KEYS) {
    const aliases = key2 === "memory" ? ["memory", "maxmemory"] : [key2];
    let value;
    for (const alias of aliases) {
      value = option(options, alias, undefined);
      if (value === undefined && work)
        value = option(work, alias, undefined);
      if (value !== undefined)
        break;
    }
    if (value !== undefined)
      found.set(key2, value);
  }
  return found;
}
function normalizeWork(options, capabilities) {
  const requested = requestedLimits(options);
  const defaults = new Map([
    ["maxwork", new Integer(100n)]
  ]);
  if (!requested.has("maxwork"))
    requested.set("maxwork", defaults.get("maxwork"));
  if (!requested.has("maxcalls"))
    requested.set("maxcalls", requested.get("maxwork"));
  if (!requested.has("maxiterations"))
    requested.set("maxiterations", requested.get("maxwork"));
  const provider = providerLimits(capabilities);
  const effective = new Map;
  for (const key2 of LIMIT_KEYS) {
    const value = restrictiveLimit(requested.get(key2), provider.get(key2));
    if (value === null || value === undefined)
      continue;
    if (["maxwork", "maxcalls", "maxiterations", "maxdepth", "memory"].includes(key2)) {
      asNonnegativeInteger(value, key2);
    } else if (key2 === "timeout") {
      asRational3(value, key2, { positive: true });
    }
    effective.set(key2, value);
  }
  return refinementMap(effective);
}
function normalizeRefinementRequest(options = null, { operation = null, capabilities = null } = {}) {
  const source = options?.type === "map" && options.entries instanceof Map ? options : refinementMap();
  const selectedOperation = nameOf(operation, nameOf(option(source, "operation", null), "enclose"));
  if (!OPERATIONS.has(selectedOperation))
    throw new RangeError(`Unknown refinement operation '${selectedOperation}'`);
  const absoluteWidthValue = option(source, "absolutewidth", option(source, "width", null));
  const relativeWidthValue = option(source, "relativewidth", null);
  const relativeWidth = relativeWidthValue === null ? null : asRational3(relativeWidthValue, "relativeWidth", { positive: true });
  const absoluteLimit = absoluteWidthValue === null ? relativeWidth === null ? new Rational(1n, 1000n) : null : asRational3(absoluteWidthValue, "absoluteWidth", { positive: true });
  const relativeScale = relativeWidth === null ? null : asRational3(option(source, "relativescale", option(source, "scale", Rational.one)), "relativeScale", { positive: true });
  const relativeLimit = relativeWidth === null ? null : relativeWidth.multiply(relativeScale);
  const absoluteWidth = absoluteLimit === null ? relativeLimit : relativeLimit === null || absoluteLimit.lessThanOrEqual(relativeLimit) ? absoluteLimit : relativeLimit;
  const work = normalizeWork(source, capabilities);
  const entries2 = [
    ["valuekind", refinementText("refinementRequest")],
    ["schema", refinementText(REFINEMENT_REQUEST_SCHEMA)],
    ["operation", refinementText(selectedOperation)],
    ["absolutewidth", absoluteWidth],
    ["absolutelimit", absoluteLimit],
    ["relativewidth", relativeWidth],
    ["relativescale", relativeScale],
    ["effectivewidth", absoluteWidth],
    ["evidencerequired", option(source, "evidencerequired", refinementText("any"))],
    ["trace", option(source, "trace", new Integer(1n))],
    ["seed", option(source, "seed", new Integer(1n))],
    ["work", work]
  ];
  const purpose = option(source, "purpose", null);
  if (purpose !== null)
    entries2.push(["purpose", purpose]);
  for (const key2 of ["timeout", "memory"]) {
    const value = refinementEntry(work, key2, null);
    if (value !== null)
      entries2.push([key2, value]);
  }
  return refinementMap(entries2);
}
function refinementEffectiveLimits(request, capabilities = null) {
  return normalizeWork(normalizeRefinementRequest(request), capabilities);
}
function refinementSupports(capabilities, operation) {
  if (!(capabilities?.type === "map" && capabilities.entries instanceof Map))
    return false;
  if (nameOf(refinementEntry(capabilities, "schema", null)) !== REFINEMENT_CAPABILITIES_SCHEMA)
    return false;
  const wanted = nameOf(operation);
  const operations = refinementEntry(capabilities, "operations", null)?.values;
  return Array.isArray(operations) && operations.some((item) => nameOf(item) === wanted);
}
function intervalWidth(interval) {
  return interval.high.subtract(interval.low);
}
function limitObserved(work, name) {
  if (!(work?.type === "map" && work.entries instanceof Map))
    return null;
  const aliases = name === "maxwork" ? ["total", "work", "calls"] : name === "maxcalls" ? ["calls"] : name === "maxiterations" ? ["iterations"] : name === "maxdepth" ? ["depth"] : name === "timeout" ? ["elapsed", "timeout"] : name === "memory" ? ["memory", "maxmemory"] : [];
  for (const alias of aliases) {
    const value = refinementEntry(work, alias, null);
    if (value !== null)
      return value;
  }
  return null;
}
function evidenceSatisfies(actualValue, requiredValue) {
  const required = nameOf(requiredValue, "any");
  if (required === "any")
    return true;
  const actual = nameOf(actualValue, "");
  if (!EVIDENCE_RANK.has(required))
    return actual === required;
  return (EVIDENCE_RANK.get(actual) ?? -1) >= EVIDENCE_RANK.get(required);
}
function checkRefinementResult(result, request, capabilities = null) {
  const normalizedRequest = normalizeRefinementRequest(request);
  const isMap = result?.type === "map" && result.entries instanceof Map;
  const requiredFields = [
    "schema",
    "status",
    "interval",
    "certified",
    "goalmet",
    "evidencelevel",
    "backend",
    "operation",
    "requestedwidth",
    "achievedwidth",
    "work",
    "diagnostics"
  ];
  const fieldsPresent = isMap && requiredFields.every((key2) => {
    const wanted = key2.toLowerCase();
    return Array.from(result.entries.keys()).some((candidate) => String(candidate).toLowerCase() === wanted);
  });
  const schemaValid = isMap && nameOf(refinementEntry(result, "schema", null)) === REFINEMENT_RESULT_SCHEMA;
  const status = nameOf(refinementEntry(result, "status", null));
  const statusValid = STATUSES.has(status);
  const interval = refinementEntry(result, "interval", null);
  const intervalValid = interval instanceof RationalInterval;
  const requestedOperation = nameOf(refinementEntry(normalizedRequest, "operation", null));
  const operationValid = nameOf(refinementEntry(result, "operation", null)) === requestedOperation;
  const capabilityValid = capabilities === null || refinementSupports(capabilities, requestedOperation);
  const certified = truth(refinementEntry(result, "certified", null));
  const certificationValid = capabilities === null || !certified || truth(refinementEntry(capabilities, "certified", null));
  const approximation = refinementEntry(result, "approximation", null);
  const approximationPresent = !certified || approximation instanceof CertifiedApproximation;
  const approximationConsistent = !certified || approximation instanceof CertifiedApproximation && intervalValid && approximation.enclosure.equals(interval);
  const achievedWidth = refinementEntry(result, "achievedwidth", null);
  const widthConsistent = !intervalValid || (achievedWidth instanceof Integer || achievedWidth instanceof Rational) && asRational3(achievedWidth, "achievedWidth").equals(intervalWidth(interval));
  const requestedWidth = refinementEntry(normalizedRequest, "absolutewidth", null);
  const resultRequestedWidth = refinementEntry(result, "requestedwidth", null);
  const requestedWidthConsistent = (resultRequestedWidth instanceof Integer || resultRequestedWidth instanceof Rational) && asRational3(resultRequestedWidth, "requestedWidth").equals(requestedWidth);
  const widthGoal = intervalValid && intervalWidth(interval).lessThanOrEqual(requestedWidth);
  const goalMet = truth(refinementEntry(result, "goalmet", null));
  const goalConsistent = certified ? goalMet === widthGoal && !(["budgetExhausted", "resolutionFloor", "unsupported", "unknown"].includes(status) && goalMet) : !goalMet;
  const statusConsistent = (status !== "enclosed" || certified && goalMet) && (status !== "approximate" || !certified) && (status !== "unsupported" || !certified);
  const evidenceValid = evidenceSatisfies(refinementEntry(result, "evidencelevel", null), refinementEntry(normalizedRequest, "evidencerequired", null));
  const capabilityEvidence = refinementEntry(capabilities, "evidencelevels", null)?.values;
  const actualEvidence = nameOf(refinementEntry(result, "evidencelevel", null));
  const capabilityEvidenceValid = capabilities === null || !Array.isArray(capabilityEvidence) || capabilityEvidence.some((item) => nameOf(item) === actualEvidence);
  const work = refinementEntry(result, "work", null);
  const requestWork = refinementEntry(normalizedRequest, "work", null);
  let workWithinLimits = work?.type === "map" && work.entries instanceof Map;
  if (workWithinLimits) {
    for (const key2 of LIMIT_KEYS) {
      const limit = refinementEntry(requestWork, key2, null);
      const observed = limitObserved(work, key2);
      if (limit !== null && observed !== null && exactLessThanOrEqual(observed, limit) !== true) {
        workWithinLimits = false;
        break;
      }
    }
  }
  const valid = Boolean(fieldsPresent && schemaValid && statusValid && intervalValid && operationValid && capabilityValid && certificationValid && approximationPresent && approximationConsistent && requestedWidthConsistent && widthConsistent && goalConsistent && statusConsistent && evidenceValid && capabilityEvidenceValid && workWithinLimits);
  return refinementMap([
    ["valuekind", refinementText("numericsResultCheck")],
    ["valid", bool(valid)],
    ["fieldspresent", bool(fieldsPresent)],
    ["schemavalid", bool(schemaValid)],
    ["statusvalid", bool(statusValid)],
    ["intervalvalid", bool(intervalValid)],
    ["operationvalid", bool(operationValid)],
    ["capabilityvalid", bool(capabilityValid)],
    ["certificationvalid", bool(certificationValid)],
    ["approximationpresent", bool(approximationPresent)],
    ["approximationconsistent", bool(approximationConsistent)],
    ["widthconsistent", bool(widthConsistent)],
    ["requestedwidthconsistent", bool(requestedWidthConsistent)],
    ["goalconsistent", bool(goalConsistent)],
    ["statusconsistent", bool(statusConsistent)],
    ["evidencevalid", bool(evidenceValid)],
    ["capabilityevidencevalid", bool(capabilityEvidenceValid)],
    ["workwithinlimits", bool(workWithinLimits)],
    ["interval", interval],
    ["request", normalizedRequest],
    ["result", result]
  ]);
}
function unsupportedRefinementResult(request, capabilities = null, reason = "unsupported") {
  const normalized = normalizeRefinementRequest(request);
  const operation = refinementEntry(normalized, "operation", refinementText("refine"));
  const backend = refinementEntry(capabilities, "backend", refinementText("unknown"));
  return refinementMap([
    ["valuekind", refinementText("enclosure")],
    ["schema", refinementText(REFINEMENT_RESULT_SCHEMA)],
    ["status", refinementText("unsupported")],
    ["interval", RationalInterval.zero],
    ["certified", null],
    ["goalmet", null],
    ["requestedwidth", refinementEntry(normalized, "absolutewidth", null)],
    ["achievedwidth", Rational.zero],
    ["evidencelevel", refinementText("approximate")],
    ["backend", backend],
    ["operation", operation],
    ["work", refinementMap()],
    ["diagnostics", refinementSequence([refinementText(reason)])]
  ]);
}
function refinementOutcome(result, request, capabilities = null) {
  const check = checkRefinementResult(result, request, capabilities);
  const status = nameOf(refinementEntry(result, "status", null), "unknown");
  const certified = truth(refinementEntry(result, "certified", null));
  const approximation = refinementEntry(result, "approximation", null);
  const details = refinementMap([
    ["status", refinementEntry(result, "status", refinementText(status))],
    ["backend", refinementEntry(result, "backend", refinementText("unknown"))],
    ["requestedwidth", refinementEntry(request, "absolutewidth", null)],
    ["achievedwidth", refinementEntry(result, "achievedwidth", null)],
    ["work", refinementEntry(result, "work", refinementMap())],
    ["diagnostics", refinementEntry(result, "diagnostics", refinementSequence())],
    ["evidence", refinementEntry(result, "evidence", null)],
    ["check", check]
  ]);
  if (!certified)
    return { value: null, reason: status === "unsupported" ? "unsupported" : "providerUncertified", details, check };
  if (!truth(refinementEntry(check, "valid", null)))
    return { value: null, reason: "invalidProviderResult", details, check };
  if (approximation instanceof CertifiedApproximation) {
    const fallbackReason = status === "budgetExhausted" ? "budgetExhausted" : status === "resolutionFloor" ? "resolutionFloor" : status === "unsupported" ? "unsupported" : status === "unknown" ? "unknown" : "haloResolutionReached";
    return { value: approximation, reason: fallbackReason, details, check };
  }
  return { value: null, reason: "invalidProviderResult", details, check };
}

// ../../rix/src/runtime/math-real.js
var states = new WeakMap;
var TOKEN = "__math_real_token";
var nextIdentity = 1;
var yes = (value) => value instanceof Integer && value.value === 1n;
var then = (value, finish) => value instanceof Promise ? value.then(finish) : finish(value);
var method3 = (source, name, args, context, evaluate) => evaluate({ fn: "CALL_METHOD", args: [source, name, ...args] }, context);
function realConstantState(value) {
  if (value?.type !== "math_real")
    return null;
  const state = states.get(value._ext?.get(TOKEN));
  if (!state)
    throw new Error("Invalid mathematical real identity");
  return state;
}
function restoreRealSnapshot(interval, savedEvidence) {
  if (!(interval instanceof RationalInterval) || interval.low.denominator === 0n || interval.high.denominator === 0n)
    throw new Error("Invalid saved real enclosure");
  const token = () => {
    throw new Error("Opaque real identity is not callable");
  };
  states.set(token, {
    id: `real:${nextIdentity++}`,
    source: null,
    capabilities: null,
    interval,
    evidence: { type: "string", value: "declared" },
    savedEvidence,
    result: { type: "map", entries: new Map([["status", { type: "string", value: "snapshot" }], ["goalmet", null]]) }
  });
  return { type: "math_real", _ext: new Map([[TOKEN, token], ["immutable", new Integer(1n)]]) };
}
function requestFor(options, capabilities) {
  if (options !== null && options !== undefined && options?.type !== "map")
    throw new Error("Real refinement options require a map");
  return normalizeRefinementRequest(options, { operation: "refine", capabilities });
}
function checkedInterval(result, request, capabilities) {
  const check = checkRefinementResult(result, request, capabilities);
  const interval = refinementEntry(result, "interval");
  if (!yes(refinementEntry(check, "valid")) || !yes(refinementEntry(result, "certified")) || !(interval instanceof RationalInterval)) {
    throw new Error("Mathematical real requires a valid certified refinement result");
  }
  if (interval.low.denominator === 0n || interval.high.denominator === 0n)
    throw new Error("Mathematical real requires a finite certified enclosure");
  return interval;
}
function adaptRealConstant(source, options, context, evaluate) {
  const captured = deepCopyValue(source);
  return then(method3(captured, "NUMERICSCAPABILITIES", [], context, evaluate), (capabilities) => {
    if (!refinementSupports(capabilities, "refine") || !yes(refinementEntry(capabilities, "certified")) || !yes(refinementEntry(capabilities, "arbitraryrefinement")) || refinementEntry(capabilities, "denotation")?.value !== "singleton") {
      throw new Error("Mathematical real requires a certified arbitrarily refinable singleton provider");
    }
    const request = requestFor(options, capabilities);
    return then(method3(captured, "REFINE", [request], context, evaluate), (result) => {
      const interval = checkedInterval(result, request, capabilities);
      const token = () => {
        throw new Error("Opaque real identity is not callable");
      };
      states.set(token, {
        id: `real:${nextIdentity++}`,
        source: captured,
        capabilities: deepCopyValue(capabilities),
        interval,
        evidence: refinementEntry(result, "evidencelevel"),
        result: deepCopyValue(result)
      });
      return { type: "math_real", _ext: new Map([[TOKEN, token], ["immutable", new Integer(1n)]]) };
    });
  });
}
function refineRealConstant(value, options, context, evaluate) {
  const state = realConstantState(value);
  if (!state)
    throw new Error("ExpressionRefine requires an adapted real constant");
  if (!state.source)
    throw new Error("Saved real is a frozen snapshot; no refinement recipe is installed");
  const request = requestFor(options, state.capabilities);
  return then(method3(state.source, "REFINE", [request], context, evaluate), (result) => {
    const interval = checkedInterval(result, request, state.capabilities);
    if (interval.high.lessThan(state.interval.low) || state.interval.high.lessThan(interval.low)) {
      throw new Error("Refinement contradicts the retained real enclosure");
    }
    const lower = interval.low.greaterThan(state.interval.low) ? interval.low : state.interval.low;
    const upper = interval.high.lessThan(state.interval.high) ? interval.high : state.interval.high;
    state.interval = new RationalInterval(lower, upper);
    const evidence = refinementEntry(result, "evidencelevel");
    if (state.evidence?.value !== evidence?.value)
      state.evidence = { type: "string", value: "mixed" };
    state.result = deepCopyValue(result);
    return result;
  });
}

// ../../rix/src/runtime/refinable-real-json.js
var REFINABLE_REAL_SCHEMA = "rix.refinable-real@1";
var REAL_JSON_LIMITS = Object.freeze({ text: 2000000, nodes: 8192, depth: 64, digits: 4096, evidence: 128, graphNodes: 128, calls: 4096 });
var fail3 = (message) => {
  throw new Error(`Real interchange: ${message}`);
};
var str = (value) => ({ type: "string", value });
var field = (value, name) => value?.entries?.get(name.toLowerCase());
var realState = (value) => realConstantState(field(value, "kind")?.value === "constant" ? field(value, "value") : value);
var one = (value) => value instanceof Integer && value.value === 1n;
var record = (entries2) => ({ type: "map", entries: new Map(entries2), _ext: new Map([["immutable", new Integer(1n)]]) });
function tree(value, depth = 0, budget = { nodes: 0 }) {
  if (typeof value === "number" && !Number.isFinite(value))
    fail3("nonfinite JSON number");
  if (++budget.nodes > REAL_JSON_LIMITS.nodes || depth > REAL_JSON_LIMITS.depth)
    fail3("structure budget exceeded");
  if (value && typeof value === "object")
    for (const child of Object.values(value))
      tree(child, depth + 1, budget);
}
function clone(value) {
  const source = JSON.stringify(value);
  if (source.length > REAL_JSON_LIMITS.text)
    fail3("text budget exceeded");
  const result = JSON.parse(source);
  tree(result);
  return result;
}
function integer(value) {
  if (typeof value !== "string" || value.length > REAL_JSON_LIMITS.digits || !/^(0|-?[1-9][0-9]*)$/.test(value))
    fail3("invalid or oversized exact integer");
  return BigInt(value);
}
function exact2(value) {
  if (!value || typeof value !== "object" || Object.keys(value).length !== 1)
    fail3("requires exact scalar tag");
  if (Object.hasOwn(value, "$integer"))
    return new Rational(integer(value.$integer));
  if (Array.isArray(value.$rational) && value.$rational.length === 2) {
    const [n, d] = value.$rational.map(integer);
    if (d <= 0n)
      fail3("nonpositive denominator");
    const r = new Rational(n, d);
    if (r.numerator !== n || r.denominator !== d)
      fail3("noncanonical rational");
    return r;
  }
  fail3("invalid scalar tag");
}
function encodeExact(value) {
  const r = value instanceof Integer ? new Rational(value.value) : value;
  if (!(r instanceof Rational) || r.denominator <= 0n)
    fail3("requires finite exact scalar");
  integer(String(r.numerator));
  integer(String(r.denominator));
  return r.denominator === 1n ? { $integer: String(r.numerator) } : { $rational: [String(r.numerator), String(r.denominator)] };
}
function interval(value) {
  if (!value || Object.keys(value).length !== 1 || !Array.isArray(value.$interval) || value.$interval.length !== 2)
    fail3("invalid interval");
  const [low, high] = value.$interval.map(exact2);
  if (low.greaterThan(high))
    fail3("descending singleton enclosure");
  return new RationalInterval(low, high);
}
var encodeInterval = (value) => ({ $interval: [encodeExact(value.low), encodeExact(value.high)] });
function short(value, label) {
  if (typeof value !== "string" || !value.length || value.length > 256)
    fail3(`invalid ${label}`);
  return value;
}
function shape(value, required, optional = []) {
  if (!value || typeof value !== "object" || Array.isArray(value) || required.some((key2) => !Object.hasOwn(value, key2)) || Object.keys(value).some((key2) => ![...required, ...optional].includes(key2)))
    fail3("unexpected or missing fields");
}
function sorted(value) {
  if (Array.isArray(value))
    return value.map(sorted);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.keys(value).sort().map((key2) => [key2, sorted(value[key2])]));
  return value;
}
var stable = (value) => JSON.stringify(sorted(value));
var METHODS = Object.freeze({ "rix.function.sqrt@1": ["Sqrt", 1, "nonnegative"], "rix.function.exp@1": ["Exp", 1, "real"], "rix.function.log@1": ["Log", 1, "positive"], "rix.function.sin@1": ["Sin", 1, "real"], "rix.function.cos@1": ["Cos", 1, "real"], "rix.function.tan@1": ["Tan", 1, "poleFree"] });
var REAL_RECIPE_SEMANTICS = Object.freeze(["rix.constant.pi@1", "rix.constant.e@1", ...Object.keys(METHODS)]);
function graph(node, budget = { nodes: 0 }, depth = 0) {
  if (++budget.nodes > REAL_JSON_LIMITS.graphNodes || depth > 32)
    fail3("recipe graph budget exceeded");
  if (!node || typeof node !== "object")
    fail3("invalid recipe graph");
  const child = (value) => graph(value, budget, depth + 1);
  switch (node.kind) {
    case "constant":
      shape(node, ["kind", "value"]);
      exact2(node.value);
      break;
    case "namedConstant":
      shape(node, ["kind", "semanticId"]);
      if (!REAL_RECIPE_SEMANTICS.slice(0, 2).includes(node.semanticId))
        return false;
      break;
    case "negate":
      shape(node, ["kind", "argument"]);
      return child(node.argument);
    case "add":
    case "subtract":
    case "multiply":
    case "divide":
      shape(node, ["kind", "left", "right"]);
      {
        const left = child(node.left), right = child(node.right);
        return left && right;
      }
    case "power":
      shape(node, ["kind", "base", "exponent"]);
      if (integer(node.exponent) < -64n || integer(node.exponent) > 64n)
        fail3("power budget exceeded");
      return child(node.base);
    case "call":
      shape(node, ["kind", "semanticId", "branch", "arguments"]);
      short(node.semanticId, "semantic ID");
      short(node.branch, "branch");
      if (!Array.isArray(node.arguments) || node.arguments.length > 8)
        fail3("invalid call arguments");
      {
        const args = node.arguments.map(child);
        const entry = METHODS[node.semanticId];
        return !!entry && entry[1] === args.length && entry[2] === node.branch && args.every(Boolean);
      }
    default:
      return false;
  }
  return true;
}
function subjectGraph(subject) {
  return subject.kind === "namedConstant" ? { kind: "namedConstant", semanticId: subject.semanticId } : subject.kind === "expression" ? subject.graph : null;
}
function validate(source) {
  if (typeof source !== "string" || source.length > REAL_JSON_LIMITS.text)
    fail3("text budget exceeded");
  let doc;
  try {
    doc = JSON.parse(source);
  } catch {
    fail3("invalid JSON");
  }
  tree(doc);
  shape(doc, ["schema", "subject", "snapshot", "recipe"], ["id", "requirements", "metadata"]);
  if (doc.schema !== REFINABLE_REAL_SCHEMA)
    fail3("unsupported version");
  if (doc.id !== undefined)
    short(doc.id, "document ID");
  if (!doc.subject || typeof doc.subject !== "object" || Array.isArray(doc.subject))
    fail3("invalid subject");
  short(doc.subject.kind, "subject kind");
  if (doc.subject.kind === "opaqueSingleton") {
    shape(doc.subject, ["kind", "stableName"]);
    short(doc.subject.stableName, "opaque name");
  } else if (doc.subject.kind === "namedConstant") {
    shape(doc.subject, ["kind", "semanticId"]);
    short(doc.subject.semanticId, "constant ID");
  } else if (doc.subject.kind === "expression") {
    shape(doc.subject, ["kind", "graph"]);
    graph(doc.subject.graph);
  }
  const s = doc.snapshot;
  shape(s, ["interval", "status", "evidenceLevel", "verification", "evidence", "achievedWidth", "work"]);
  const enclosure = interval(s.interval);
  if (!enclosure.high.subtract(enclosure.low).equals(exact2(s.achievedWidth)))
    fail3("inconsistent snapshot width");
  if (!["certified", "assumed", "approximate", "unresolved"].includes(s.status) || !["checked", "providerChecked", "unavailable", "failed"].includes(s.verification))
    fail3("invalid evidence status");
  short(s.evidenceLevel, "evidence level");
  if (!Array.isArray(s.evidence) || s.evidence.length > REAL_JSON_LIMITS.evidence || s.evidence.some((item) => !item || typeof item !== "object" || Array.isArray(item)))
    fail3("invalid evidence list");
  for (const evidence of s.evidence)
    if (evidence.schema === "rix.real.replay-evidence@1") {
      shape(evidence, ["schema", "checker", "provider", "providerVersion", "algorithm", "algorithmVersion", "claim", "premises", "conclusion"]);
      for (const key2 of ["checker", "provider", "providerVersion", "algorithm", "algorithmVersion"])
        short(evidence[key2], key2);
      interval(evidence.conclusion);
      if (stable(evidence.claim) !== stable(doc.subject))
        fail3("replay evidence subject mismatch");
    }
  shape(s.work, ["calls", "iterations"], ["exhausted"]);
  if (integer(s.work.calls) < 0n || integer(s.work.iterations) < 0n)
    fail3("negative work");
  if (s.work.exhausted !== undefined && typeof s.work.exhausted !== "boolean")
    fail3("invalid exhaustion");
  if (doc.recipe !== null) {
    if (!doc.recipe || typeof doc.recipe !== "object" || Array.isArray(doc.recipe))
      fail3("invalid recipe");
    short(doc.recipe.kind, "recipe kind");
  }
  if (doc.requirements !== undefined && (!Array.isArray(doc.requirements) || doc.requirements.length > 128))
    fail3("invalid requirements");
  if (doc.metadata !== undefined && (!doc.metadata || typeof doc.metadata !== "object" || Array.isArray(doc.metadata)))
    fail3("invalid metadata");
  return { doc, enclosure };
}

class RealRecipeRegistry {
  #providers = new Map;
  register({ provider, providerVersion, algorithm, algorithmVersion, checker, refine, check }) {
    for (const value of [provider, providerVersion, algorithm, algorithmVersion, checker])
      short(value, "provider identity");
    if (typeof refine !== "function" || typeof check !== "function")
      fail3("provider requires refinement and an independent checker");
    const key2 = stable([provider, providerVersion, algorithm, algorithmVersion, checker]);
    if (this.#providers.has(key2))
      fail3("provider already registered");
    this.#providers.set(key2, Object.freeze({ provider, providerVersion, algorithm, algorithmVersion, checker, refine, check }));
    return this;
  }
  resolve(recipe) {
    return recipe && this.#providers.get(stable([recipe.provider, recipe.providerVersion, recipe.algorithm, recipe.algorithmVersion, recipe.checker]));
  }
}
function decodeRefinableReal(source) {
  const { doc, enclosure } = validate(source), value = restoreRealSnapshot(enclosure, doc.snapshot.evidenceLevel), state = realConstantState(value);
  state.interchange = { document: clone(doc), verification: "unavailable", diagnostics: ["Imported evidence has not been replayed"], revision: 0 };
  return value;
}
function encodeRefinableReal(value) {
  const state = realState(value);
  if (!state)
    fail3("requires mathematical real");
  const doc = state.interchange?.document ?? { schema: REFINABLE_REAL_SCHEMA, subject: { kind: "opaqueSingleton", stableName: "subject" }, snapshot: { interval: encodeInterval(state.interval), status: state.source ? "certified" : "assumed", evidenceLevel: state.savedEvidence ?? state.evidence?.value ?? "declared", verification: "unavailable", evidence: [], achievedWidth: encodeExact(state.interval.high.subtract(state.interval.low)), work: { calls: "0", iterations: "0" } }, recipe: null };
  const source = stable(doc);
  validate(source);
  return source;
}
function inspectRefinableReal(value) {
  const state = realState(value);
  if (!state)
    fail3("requires mathematical real");
  const saved = state.interchange;
  return record([["schema", str("rix.real.import-state@1")], ["interval", state.interval], ["verification", str(saved?.verification ?? "unavailable")], ["status", str(saved?.document.snapshot.status ?? "assumed")], ["state", str(saved?.verification === "providerChecked" ? "checkedSnapshot" : "frozen")], ["diagnostics", { type: "sequence", values: (saved?.diagnostics ?? ["No portable recipe"]).map(str) }], ["subject", str(stable(saved?.document.subject ?? { kind: "opaqueSingleton" }))]]);
}
function request(options) {
  if (options !== null && options !== undefined && options?.type !== "map")
    fail3("refinement options require a map");
  const count = (name, fallback) => {
    const x = field(options, name) ?? new Integer(BigInt(fallback));
    if (!(x instanceof Integer) || x.value < 1n || x.value > BigInt(REAL_JSON_LIMITS.calls))
      fail3(`${name} must be 1..4096`);
    return Number(x.value);
  };
  const width = field(options, "width") ?? new Rational(1n, 1000000n);
  const scalar = width instanceof Integer ? new Rational(width.value) : width;
  if (!(scalar instanceof Rational) || scalar.numerator <= 0n)
    fail3("width must be positive exact scalar");
  encodeExact(scalar);
  return Object.freeze({ width: scalar, maxCalls: count("maxcalls", 256), maxIterations: count("maxiterations", 256) });
}
async function refineImportedReal(value, options, registry, runtime = {}) {
  const state = realState(value);
  if (!state?.interchange)
    fail3("requires an imported real envelope");
  const saved = state.interchange, revision = saved.revision;
  const doc = clone(saved.document), r = doc.recipe, provider = registry?.resolve(r), sg = subjectGraph(doc.subject);
  const unavailable = (message) => {
    saved.diagnostics = [message];
    return inspectRefinableReal(value);
  };
  if (!provider)
    return unavailable("Exact provider, algorithm or checker version is unavailable");
  if (!sg || !graph(sg) || r.kind !== "expression" || stable(r.graph) !== stable(sg))
    return unavailable("Recipe is unsupported or does not establish the saved subject");
  if ((doc.requirements ?? []).some((item) => item.provider !== provider.provider || item.providerVersion !== provider.providerVersion || item.algorithm !== provider.algorithm || item.algorithmVersion !== provider.algorithmVersion || item.checker !== provider.checker))
    return unavailable("A required provider/checker version is unavailable");
  const limits = request(options);
  if (limits.maxCalls < 2 || limits.maxIterations < 2)
    return unavailable("Insufficient work budget for refinement and independent replay");
  const part = { ...limits, maxCalls: Math.floor(limits.maxCalls / 2), maxIterations: Math.floor(limits.maxIterations / 2) };
  try {
    const result = await provider.refine(clone(sg), part, runtime);
    if (!(result?.interval instanceof RationalInterval))
      return unavailable("Provider returned no finite enclosure");
    encodeInterval(result.interval);
    const checked = await provider.check(clone(sg), result, part, runtime);
    if (checked !== true) {
      saved.verification = "failed";
      return unavailable("Provider evidence replay failed");
    }
    if (saved.revision !== revision)
      return unavailable("Concurrent refinement changed the retained snapshot; retry explicitly");
    if (result.interval.low.lessThan(state.interval.low) || result.interval.high.greaterThan(state.interval.high)) {
      if (result.interval.high.lessThan(state.interval.low) || result.interval.low.greaterThan(state.interval.high))
        saved.verification = "failed";
      return unavailable("Checked result does not nest inside the saved enclosure; retained snapshot unchanged");
    }
    const work = result.work ?? {};
    const calls = Number(work.calls ?? 0), iterations = Number(work.iterations ?? 0);
    if (!Number.isSafeInteger(calls) || !Number.isSafeInteger(iterations) || calls < 0 || iterations < 0 || calls > part.maxCalls || iterations > part.maxIterations)
      fail3("provider exceeded work contract");
    doc.snapshot = { interval: encodeInterval(result.interval), status: "certified", evidenceLevel: "proof", verification: "providerChecked", evidence: [{ schema: "rix.real.replay-evidence@1", checker: provider.checker, provider: provider.provider, providerVersion: provider.providerVersion, algorithm: provider.algorithm, algorithmVersion: provider.algorithmVersion, claim: clone(doc.subject), premises: { request: { width: encodeExact(limits.width), maxCalls: String(limits.maxCalls), maxIterations: String(limits.maxIterations) } }, conclusion: encodeInterval(result.interval) }], achievedWidth: encodeExact(result.interval.high.subtract(result.interval.low)), work: { calls: String(calls * 2), iterations: String(iterations * 2) } };
    validate(stable(doc));
    state.interval = result.interval;
    saved.document = doc;
    saved.verification = "providerChecked";
    saved.diagnostics = [];
    saved.revision++;
    return inspectRefinableReal(value);
  } catch (error) {
    return unavailable(`Refinement unavailable: ${String(error?.message ?? error).slice(0, 512)}`);
  }
}
async function numericsRefine(node, limits, runtime) {
  if (typeof runtime.evaluate !== "function")
    fail3("Numerics provider requires its permitted evaluator context");
  const call = (namespace, method4, args = []) => runtime.evaluate({ fn: "CALL_METHOD", args: [{ fn: "SYS_GET", args: [namespace] }, method4, ...args] }, runtime.context);
  let nodes = 0;
  async function build(n) {
    if (++nodes > REAL_JSON_LIMITS.graphNodes)
      fail3("recipe graph budget exceeded");
    switch (n.kind) {
      case "constant":
        return exact2(n.value);
      case "namedConstant":
        return call("numerics", "Constant", [str(n.semanticId === "rix.constant.pi@1" ? "pi" : "e")]);
      case "negate":
        return call("oracle", "Negate", [await build(n.argument)]);
      case "add":
      case "subtract":
      case "multiply":
      case "divide":
        return call("oracle", n.kind[0].toUpperCase() + n.kind.slice(1), [await build(n.left), await build(n.right)]);
      case "power": {
        const power = Number(integer(n.exponent));
        let result2 = new Rational(1n), base = await build(n.base);
        for (let i = 0;i < Math.abs(power); i++)
          result2 = await call("oracle", "Multiply", [result2, base]);
        return power < 0 ? call("oracle", "Reciprocal", [result2]) : result2;
      }
      case "call":
        return call("numerics", METHODS[n.semanticId][0], await Promise.all(n.arguments.map(build)));
      default:
        fail3("unsupported recipe node");
    }
  }
  const value = await build(node), options = record([["abstol", limits.width], ["maxcalls", new Integer(BigInt(limits.maxCalls))], ["maxiterations", new Integer(BigInt(limits.maxIterations))]]);
  const result = await call("numerics", "Refine", [value, options]), range = field(result, "interval");
  if (!one(field(result, "certified")) || !(range instanceof RationalInterval))
    fail3("Numerics did not establish a certified singleton enclosure");
  const work = field(result, "work");
  return { interval: range, work: { calls: Number(field(work, "calls")?.value ?? 0n), iterations: Number(field(work, "iterations")?.value ?? 0n) } };
}
function createDefaultRealRecipeRegistry() {
  return new RealRecipeRegistry().register({ provider: "numerics", providerVersion: "2", algorithm: "semantic-enclosure", algorithmVersion: "1", checker: "rix.real.numerics-replay@1", refine: numericsRefine, async check(node, result, limits, runtime) {
    const replay = await numericsRefine(node, limits, runtime);
    return replay.interval.low.equals(result.interval.low) && replay.interval.high.equals(result.interval.high);
  } });
}
var registry = createDefaultRealRecipeRegistry();
var realJSONCapabilities = {
  RealImportJSON: { impl: ([source]) => decodeRefinableReal(source?.value ?? source), pure: false, doc: "Load a bounded frozen real envelope without executing recipes" },
  RealExportJSON: { impl: ([value]) => str(encodeRefinableReal(value)), pure: false, doc: "Export a deterministic real envelope with exact scalar tags" },
  RealImportInfo: { impl: ([value]) => inspectRefinableReal(value), pure: false, doc: "Inspect imported real evidence without activating a provider" },
  RealRefineImported: { impl: ([value, options], context, evaluate) => refineImportedReal(value, options, registry, { context, evaluate }), pure: false, doc: "Explicitly refine with an already-installed permitted Numerics provider and replay checker" }
};

// ../../rix/src/runtime/math-context-methods.js
function attachMathContextMethods(value) {
  if (value?.entries?.get("schema")?.value !== "rix.math.context@1")
    return value;
  const entries2 = new Map;
  for (const [name, capability] of [["Eval", "MathEvaluate"], ["Substitute", "MathSubstitute"], ["Instantiate", "MathInstantiate"]]) {
    entries2.set(name.toUpperCase(), {
      type: "method_builtin",
      name,
      impl: (args, context, evaluate) => evaluate({ fn: "SYS_CALL", args: [capability, ...args] }, context)
    });
  }
  value._ext.set("_proto", { type: "map", entries: entries2 });
  return value;
}

// ../../rix/src/runtime/exact-values.js
var nextGeneratorId = 1;
var squareRootGenerators = new Map;
function int(value) {
  return new Integer(BigInt(value));
}
function isRationalScalar(value) {
  return value instanceof Integer || value instanceof Rational;
}
function rationalParts(value) {
  if (value instanceof Integer)
    return [value.value, 1n];
  if (value instanceof Rational)
    return [value.numerator, value.denominator];
  return null;
}
function rationalFrom(value, label = "value") {
  if (value instanceof Integer || value instanceof Rational)
    return value;
  if (typeof value === "bigint")
    return new Integer(value);
  if (typeof value === "number" && Number.isInteger(value))
    return new Integer(BigInt(value));
  throw new Error(`${label} must be an exact Integer or Rational`);
}
function isZero(value) {
  const parts = rationalParts(value);
  return parts ? parts[0] === 0n : false;
}
function isOne(value) {
  const parts = rationalParts(value);
  return parts ? parts[0] === parts[1] : false;
}
function isNegative(value) {
  const parts = rationalParts(value);
  return parts ? parts[0] < 0n : false;
}
function negateRational(value) {
  return int(0).subtract(value);
}
function absRational(value) {
  return isNegative(value) ? negateRational(value) : value;
}
function normalizePolynomial(polynomial) {
  if (!polynomial)
    return null;
  const values = polynomial.map((value, index) => rationalFrom(value, `minimal polynomial coefficient ${index}`));
  if (values.length < 2 || isZero(values[values.length - 1])) {
    throw new Error("Minimal polynomial must have positive degree and nonzero leading coefficient");
  }
  const lead = values[values.length - 1];
  return values.map((value) => value.divide(lead));
}
function createExactGenerator(name, options = {}) {
  if (!name)
    throw new Error("Exact generator requires a name");
  const generator = {
    type: "exact_generator",
    id: options.id || `exact:${nextGeneratorId++}:${name}`,
    name,
    category: options.category || (options.minimalPolynomial ? "algebraic" : "transcendental"),
    minimalPolynomial: normalizePolynomial(options.minimalPolynomial || null),
    real: options.real ?? false,
    positiveRoot: options.positiveRoot ?? false,
    _ext: new Map([["key", { type: "string", value: name }], ["immutable", int(1)]])
  };
  return Object.freeze(generator);
}
function isExactValue(value) {
  return value?.type === "exact_generator" || value?.type === "exact_expression";
}
function isCayleyValue(value) {
  return value?.type === "cayley";
}
function isCayleyInfinity(value) {
  return value?.type === "cayley_infinity";
}
var CAYLEY_INFINITY = Object.freeze({
  type: "cayley_infinity",
  _ext: new Map([["immutable", int(1)]])
});
function clonePowers(powers) {
  return new Map(powers || []);
}
function monomialKey(powers) {
  return [...powers.entries()].filter(([, exponent]) => exponent !== 0).sort(([a], [b]) => a.id.localeCompare(b.id)).map(([generator, exponent]) => `${generator.id}^${exponent}`).join("|");
}
function addRawTerm(target, powers, coefficient) {
  if (isZero(coefficient))
    return;
  const clean = new Map([...powers.entries()].filter(([, exponent]) => exponent !== 0));
  const key2 = monomialKey(clean);
  const existing = target.get(key2);
  const next = existing ? existing.coefficient.add(coefficient) : coefficient;
  if (isZero(next))
    target.delete(key2);
  else
    target.set(key2, { powers: clean, coefficient: next });
}
function reducibleGenerator(powers) {
  for (const [generator, exponent] of powers) {
    const polynomial = generator.minimalPolynomial;
    if (polynomial && exponent >= polynomial.length - 1)
      return [generator, exponent, polynomial];
  }
  return null;
}
function reduceTerms(rawTerms) {
  const result = new Map;
  const queue = [...rawTerms.values()].map((term) => ({
    powers: clonePowers(term.powers),
    coefficient: term.coefficient
  }));
  while (queue.length) {
    const term = queue.pop();
    if (isZero(term.coefficient))
      continue;
    const reducible = reducibleGenerator(term.powers);
    if (!reducible) {
      addRawTerm(result, term.powers, term.coefficient);
      continue;
    }
    const [generator, exponent, polynomial] = reducible;
    const degree = polynomial.length - 1;
    for (let i = 0;i < degree; i++) {
      if (isZero(polynomial[i]))
        continue;
      const powers = clonePowers(term.powers);
      const nextExponent = exponent - degree + i;
      if (nextExponent === 0)
        powers.delete(generator);
      else
        powers.set(generator, nextExponent);
      queue.push({
        powers,
        coefficient: term.coefficient.multiply(negateRational(polynomial[i]))
      });
    }
  }
  return result;
}
function expressionFromTerms(terms) {
  const reduced = reduceTerms(terms);
  if (reduced.size === 0)
    return int(0);
  if (reduced.size === 1 && reduced.has(""))
    return reduced.get("").coefficient;
  return { type: "exact_expression", terms: reduced };
}
function trimPolynomial(polynomial) {
  const result = [...polynomial];
  while (result.length > 0 && isZero(result[result.length - 1]))
    result.pop();
  return result;
}
function polynomialAdd(left, right) {
  const length = Math.max(left.length, right.length);
  const result = Array.from({ length }, (_, index) => (left[index] || int(0)).add(right[index] || int(0)));
  return trimPolynomial(result);
}
function polynomialNegate(polynomial) {
  return polynomial.map(negateRational);
}
function polynomialSubtract(left, right) {
  return polynomialAdd(left, polynomialNegate(right));
}
function polynomialMultiply(left, right) {
  if (left.length === 0 || right.length === 0)
    return [];
  const result = Array.from({ length: left.length + right.length - 1 }, () => int(0));
  for (let i = 0;i < left.length; i++) {
    for (let j = 0;j < right.length; j++) {
      result[i + j] = result[i + j].add(left[i].multiply(right[j]));
    }
  }
  return trimPolynomial(result);
}
function polynomialDivmod(dividend, divisor) {
  const denominator = trimPolynomial(divisor);
  if (denominator.length === 0)
    throw new Error("Polynomial division by zero");
  let remainder = trimPolynomial(dividend);
  const quotient = Array.from({ length: Math.max(0, remainder.length - denominator.length + 1) }, () => int(0));
  while (remainder.length >= denominator.length && remainder.length > 0) {
    const degree = remainder.length - denominator.length;
    const factor = remainder[remainder.length - 1].divide(denominator[denominator.length - 1]);
    quotient[degree] = quotient[degree].add(factor);
    const shifted = Array.from({ length: degree }, () => int(0)).concat(denominator.map((value) => value.multiply(factor)));
    remainder = polynomialSubtract(remainder, shifted);
  }
  return [trimPolynomial(quotient), remainder];
}
function polynomialExtendedGcd(left, right) {
  if (trimPolynomial(right).length === 0)
    return [trimPolynomial(left), [int(1)], []];
  const [quotient, remainder] = polynomialDivmod(left, right);
  const [gcd2, x1, y1] = polynomialExtendedGcd(right, remainder);
  return [gcd2, y1, polynomialSubtract(x1, polynomialMultiply(quotient, y1))];
}
function algebraicPolynomial(value) {
  const terms = toTerms(value);
  let generator = null;
  let maxExponent = 0;
  for (const term of terms.values()) {
    for (const [candidate, exponent] of term.powers) {
      if (exponent < 0 || !candidate.minimalPolynomial)
        return null;
      if (generator && generator !== candidate)
        return null;
      generator = candidate;
      maxExponent = Math.max(maxExponent, exponent);
    }
  }
  if (!generator)
    return null;
  const polynomial = Array.from({ length: maxExponent + 1 }, () => int(0));
  for (const term of terms.values()) {
    const exponent = term.powers.get(generator) || 0;
    if (term.powers.size > (exponent === 0 ? 0 : 1))
      return null;
    polynomial[exponent] = polynomial[exponent].add(term.coefficient);
  }
  return { generator, polynomial: trimPolynomial(polynomial) };
}
function expressionFromPolynomial(generator, polynomial) {
  const terms = new Map;
  for (let exponent = 0;exponent < polynomial.length; exponent++) {
    if (isZero(polynomial[exponent]))
      continue;
    addRawTerm(terms, exponent === 0 ? new Map : new Map([[generator, exponent]]), polynomial[exponent]);
  }
  return expressionFromTerms(terms);
}
function invertSingleAlgebraicExpression(value) {
  const parsed = algebraicPolynomial(value);
  if (!parsed || parsed.polynomial.length === 0)
    return null;
  const [gcd2, coefficient] = polynomialExtendedGcd(parsed.polynomial, parsed.generator.minimalPolynomial);
  if (gcd2.length !== 1 || isZero(gcd2[0]))
    return null;
  const normalized = coefficient.map((entry) => entry.divide(gcd2[0]));
  const [, reduced] = polynomialDivmod(normalized, parsed.generator.minimalPolynomial);
  return expressionFromPolynomial(parsed.generator, reduced);
}
function toTerms(value) {
  if (value?.type === "exact_expression")
    return value.terms;
  const terms = new Map;
  if (value?.type === "exact_generator") {
    addRawTerm(terms, new Map([[value, 1]]), int(1));
    return terms;
  }
  addRawTerm(terms, new Map, rationalFrom(value));
  return terms;
}
function combinePowers(left, right, sign = 1) {
  const powers = clonePowers(left);
  for (const [generator, exponent] of right) {
    const next = (powers.get(generator) || 0) + sign * exponent;
    if (next === 0)
      powers.delete(generator);
    else
      powers.set(generator, next);
  }
  return powers;
}
function addScalars(left, right) {
  if (!isExactValue(left) && !isExactValue(right))
    return rationalFrom(left).add(rationalFrom(right));
  const terms = new Map;
  for (const term of toTerms(left).values())
    addRawTerm(terms, term.powers, term.coefficient);
  for (const term of toTerms(right).values())
    addRawTerm(terms, term.powers, term.coefficient);
  return expressionFromTerms(terms);
}
function subtractScalars(left, right) {
  return addScalars(left, negateScalar(right));
}
function negateScalar(value) {
  if (!isExactValue(value))
    return negateRational(rationalFrom(value));
  const terms = new Map;
  for (const term of toTerms(value).values()) {
    addRawTerm(terms, term.powers, negateRational(term.coefficient));
  }
  return expressionFromTerms(terms);
}
function multiplyScalars(left, right) {
  if (!isExactValue(left) && !isExactValue(right))
    return rationalFrom(left).multiply(rationalFrom(right));
  const terms = new Map;
  for (const a of toTerms(left).values()) {
    for (const b of toTerms(right).values()) {
      addRawTerm(terms, combinePowers(a.powers, b.powers), a.coefficient.multiply(b.coefficient));
    }
  }
  return expressionFromTerms(terms);
}
function divideScalars(left, right) {
  if (!isExactValue(left) && !isExactValue(right))
    return rationalFrom(left).divide(rationalFrom(right));
  const algebraicInverse = invertSingleAlgebraicExpression(right);
  if (algebraicInverse !== null)
    return multiplyScalars(left, algebraicInverse);
  const denominatorTerms = [...toTerms(right).values()];
  if (denominatorTerms.length !== 1) {
    throw new Error("Division by a multi-term exact expression is not implemented");
  }
  const denominator = denominatorTerms[0];
  const terms = new Map;
  for (const numerator of toTerms(left).values()) {
    addRawTerm(terms, combinePowers(numerator.powers, denominator.powers, -1), numerator.coefficient.divide(denominator.coefficient));
  }
  return expressionFromTerms(terms);
}
function imaginaryGeneratorFrom(value, preferred = null) {
  if (preferred)
    return preferred;
  for (const term of toTerms(value).values()) {
    for (const generator of term.powers.keys()) {
      if (generator.name === "i")
        return generator;
    }
  }
  return null;
}
function complexParts(value, preferredI = null) {
  const imaginary = imaginaryGeneratorFrom(value, preferredI);
  if (!imaginary)
    return { real: value, imaginary: int(0) };
  const realTerms = new Map;
  const imaginaryTerms = new Map;
  for (const term of toTerms(value).values()) {
    const exponent = term.powers.get(imaginary) || 0;
    if (exponent !== 0 && exponent !== 1) {
      throw new Error("Complex decomposition expected powers of i to be reduced to zero or one");
    }
    const powers = clonePowers(term.powers);
    powers.delete(imaginary);
    addRawTerm(exponent === 0 ? realTerms : imaginaryTerms, powers, term.coefficient);
  }
  return {
    real: expressionFromTerms(realTerms),
    imaginary: expressionFromTerms(imaginaryTerms)
  };
}
function complexConjugate(value, preferredI = null) {
  const imaginary = imaginaryGeneratorFrom(value, preferredI);
  if (!imaginary)
    return value;
  const terms = new Map;
  for (const term of toTerms(value).values()) {
    const exponent = term.powers.get(imaginary) || 0;
    addRawTerm(terms, term.powers, exponent % 2 === 0 ? term.coefficient : negateRational(term.coefficient));
  }
  return expressionFromTerms(terms);
}
function complexFromParts(real, imaginary, iGenerator) {
  if (!iGenerator?.minimalPolynomial)
    throw new Error("Complex.FromParts requires the configured algebraic generator i");
  return addScalars(real, multiplyScalars(imaginary, iGenerator));
}
function complexNormSquared(value, preferredI = null) {
  const parts = complexParts(value, preferredI);
  return addScalars(multiplyScalars(parts.real, parts.real), multiplyScalars(parts.imaginary, parts.imaginary));
}
function bigintSqrt(value) {
  if (value < 0n)
    throw new Error("Square root requires a nonnegative value");
  if (value < 2n)
    return value;
  let x = 1n << (BigInt(value.toString(2).length) + 1n) / 2n;
  let next = x + value / x >> 1n;
  while (next < x) {
    x = next;
    next = x + value / x >> 1n;
  }
  return x;
}
function rationalSquareRoot(value) {
  const [numerator, denominator] = rationalParts(rationalFrom(value));
  if (numerator < 0n)
    throw new Error("Cayley magnitude requires a nonnegative norm squared");
  const numeratorRoot = bigintSqrt(numerator);
  const denominatorRoot = bigintSqrt(denominator);
  if (numeratorRoot * numeratorRoot !== numerator || denominatorRoot * denominatorRoot !== denominator)
    return null;
  return new Rational(numeratorRoot, denominatorRoot);
}
function exactSquareRoot(value) {
  if (!isRationalScalar(value)) {
    throw new Error("Cayley conversion currently requires a rational norm squared");
  }
  const perfect = rationalSquareRoot(value);
  if (perfect)
    return perfect.denominator === 1n ? new Integer(perfect.numerator) : perfect;
  const [numerator, denominator] = rationalParts(rationalFrom(value));
  const key2 = `${numerator}/${denominator}`;
  if (squareRootGenerators.has(key2))
    return squareRootGenerators.get(key2);
  const name = denominator === 1n ? `sqrt${numerator}` : `sqrt(${numerator}/${denominator})`;
  const generator = createExactGenerator(name, {
    id: denominator === 1n ? `exact:${name}` : `exact:sqrt:${key2}`,
    category: "algebraic",
    minimalPolynomial: [new Rational(-numerator, denominator), int(0), int(1)],
    real: true,
    positiveRoot: true
  });
  squareRootGenerators.set(key2, generator);
  return generator;
}
function scalarSign(value) {
  const parts = rationalParts(value);
  if (parts)
    return parts[0] === 0n ? 0 : parts[0] < 0n ? -1 : 1;
  if (value?.type === "exact_generator" && value.positiveRoot)
    return 1;
  if (value?.type === "exact_expression" && value.terms.size === 1) {
    const term = [...value.terms.values()][0];
    if ([...term.powers.keys()].every((generator) => generator.positiveRoot)) {
      return isNegative(term.coefficient) ? -1 : 1;
    }
  }
  return null;
}
function scalarZero(value) {
  return equalScalars(value, int(0));
}
function requireScalar(value, label) {
  if (!isRationalScalar(value) && !isExactValue(value)) {
    throw new Error(`${label} must be an exact scalar`);
  }
  return value;
}
function requireRealScalar(value, label, iGenerator = null) {
  requireScalar(value, label);
  if (!scalarZero(complexParts(value, iGenerator).imaginary)) {
    throw new Error(`${label} must be real`);
  }
  return value;
}
function negateCayleyDirection(direction) {
  return isCayleyInfinity(direction) ? CAYLEY_INFINITY : negateScalar(direction);
}
function oppositeCayleyDirection(direction) {
  if (isCayleyInfinity(direction))
    return int(0);
  if (scalarZero(direction))
    return CAYLEY_INFINITY;
  return negateScalar(divideScalars(int(1), direction));
}
function createCayley(magnitude, direction, iGenerator = null) {
  let r = requireRealScalar(magnitude, "Cayley magnitude", iGenerator);
  let t = isCayleyInfinity(direction) ? CAYLEY_INFINITY : requireRealScalar(direction, "Cayley direction", iGenerator);
  const sign = scalarSign(r);
  if (sign === null)
    throw new Error("Cayley magnitude must have a known nonnegative sign");
  if (sign < 0) {
    r = negateScalar(r);
    t = oppositeCayleyDirection(t);
  }
  if (scalarZero(r))
    t = int(0);
  return { type: "cayley", magnitude: r, direction: t, iGenerator };
}
function cayleyFromCartesian(value, preferredI = null) {
  if (isCayleyValue(value))
    return value;
  requireScalar(value, "Complex.Cayley value");
  const iGenerator = imaginaryGeneratorFrom(value, preferredI) || preferredI;
  const { real: x, imaginary: y } = complexParts(value, iGenerator);
  const q = addScalars(multiplyScalars(x, x), multiplyScalars(y, y));
  if (scalarZero(q))
    return createCayley(int(0), int(0), iGenerator);
  const r = exactSquareRoot(q);
  if (!scalarZero(y)) {
    return createCayley(r, divideScalars(subtractScalars(r, x), y), iGenerator);
  }
  const sign = scalarSign(x);
  if (sign === null)
    throw new Error("Cayley conversion cannot determine the real-axis direction exactly");
  return createCayley(r, sign < 0 ? CAYLEY_INFINITY : int(0), iGenerator);
}
function cayleyCartesian(value, preferredI = null) {
  if (!isCayleyValue(value))
    return value;
  const r = value.magnitude;
  const t = value.direction;
  if (isCayleyInfinity(t))
    return negateScalar(r);
  const tSquared = multiplyScalars(t, t);
  const denominator = addScalars(int(1), tSquared);
  const x = multiplyScalars(r, divideScalars(subtractScalars(int(1), tSquared), denominator));
  const y = multiplyScalars(r, divideScalars(multiplyScalars(int(2), t), denominator));
  if (scalarZero(y))
    return x;
  const iGenerator = value.iGenerator || preferredI;
  if (!iGenerator)
    throw new Error("Cayley.Cartesian requires the configured algebraic generator i");
  return complexFromParts(x, y, iGenerator);
}
function asCayley(value, reference) {
  return isCayleyValue(value) ? value : cayleyFromCartesian(value, reference?.iGenerator);
}
function composeCayleyDirections(left, right) {
  const leftInfinity = isCayleyInfinity(left);
  const rightInfinity = isCayleyInfinity(right);
  if (leftInfinity && rightInfinity)
    return int(0);
  if (leftInfinity || rightInfinity) {
    const finite = leftInfinity ? right : left;
    return scalarZero(finite) ? CAYLEY_INFINITY : negateScalar(divideScalars(int(1), finite));
  }
  const denominator = subtractScalars(int(1), multiplyScalars(left, right));
  if (scalarZero(denominator))
    return CAYLEY_INFINITY;
  return divideScalars(addScalars(left, right), denominator);
}
function isUnsupportedExactDivision(error) {
  return error instanceof Error && /Division by a multi-term exact expression is not implemented/.test(error.message);
}
function cayleyProductViaCartesian(left, right) {
  const iGenerator = left.iGenerator || right.iGenerator;
  const product = multiplyScalars(cayleyCartesian(left), cayleyCartesian(right));
  return cayleyFromCartesian(product, iGenerator);
}
function multiplyCayley(left, right) {
  const a = asCayley(left, right);
  const b = asCayley(right, a);
  try {
    return createCayley(multiplyScalars(a.magnitude, b.magnitude), composeCayleyDirections(a.direction, b.direction), a.iGenerator || b.iGenerator);
  } catch (error) {
    if (!isUnsupportedExactDivision(error))
      throw error;
    return cayleyProductViaCartesian(a, b);
  }
}
function conjugateCayley(value) {
  return createCayley(value.magnitude, negateCayleyDirection(value.direction), value.iGenerator);
}
function inverseCayley(value) {
  if (scalarZero(value.magnitude))
    throw new Error("Cannot invert zero in Cayley form");
  return createCayley(divideScalars(int(1), value.magnitude), negateCayleyDirection(value.direction), value.iGenerator);
}
function divideCayley(left, right) {
  const a = asCayley(left, right);
  const b = asCayley(right, a);
  return multiplyCayley(a, inverseCayley(b));
}
function negateCayley(value) {
  return createCayley(value.magnitude, oppositeCayleyDirection(value.direction), value.iGenerator);
}
function addCayley(left, right) {
  const a = asCayley(left, right);
  const b = asCayley(right, a);
  return cayleyFromCartesian(addScalars(cayleyCartesian(a), cayleyCartesian(b)), a.iGenerator || b.iGenerator);
}
function subtractCayley(left, right) {
  const a = asCayley(left, right);
  const b = asCayley(right, a);
  return cayleyFromCartesian(subtractScalars(cayleyCartesian(a), cayleyCartesian(b)), a.iGenerator || b.iGenerator);
}
function powCayley(value, exponentValue) {
  const exponent = integerExponent(exponentValue);
  if (exponent === 0)
    return createCayley(int(1), int(0), value.iGenerator);
  if (exponent < 0)
    return powCayley(inverseCayley(value), int(-exponent));
  let result = createCayley(int(1), int(0), value.iGenerator);
  let factor = value;
  let n = exponent;
  while (n > 0) {
    if (n % 2 === 1)
      result = multiplyCayley(result, factor);
    n = Math.floor(n / 2);
    if (n)
      factor = multiplyCayley(factor, factor);
  }
  return result;
}
function equalCayley(left, right) {
  const a = asCayley(left, right);
  const b = asCayley(right, a);
  return equalScalars(cayleyCartesian(a), cayleyCartesian(b));
}
function cayleyReal(value) {
  return complexParts(cayleyCartesian(value), value.iGenerator).real;
}
function cayleyImaginary(value) {
  return complexParts(cayleyCartesian(value), value.iGenerator).imaginary;
}
function complexMethod(name, operation) {
  return {
    type: "method_builtin",
    name,
    impl(args) {
      return operation(...args.slice(1));
    }
  };
}
function createDefaultComplexCollection(exactCollection) {
  const iGenerator = exactCollection?.entries?.get("i");
  const requireI = () => {
    if (!iGenerator)
      throw new Error("The active Exact collection does not define i");
    return iGenerator;
  };
  const constructCayley = (...args) => {
    if (args.length === 1)
      return cayleyFromCartesian(args[0], requireI());
    if (args.length === 2)
      return createCayley(args[0], args[1], requireI());
    throw new Error("Complex.Cayley expects a Cartesian value or magnitude and direction");
  };
  const operations = {
    conjugate: (value) => isCayleyValue(value) ? conjugateCayley(value) : complexConjugate(value, requireI()),
    re: (value) => isCayleyValue(value) ? cayleyReal(value) : complexParts(value, requireI()).real,
    im: (value) => isCayleyValue(value) ? cayleyImaginary(value) : complexParts(value, requireI()).imaginary,
    fromParts: (real, imaginary) => complexFromParts(real, imaginary, requireI()),
    normSquared: (value) => isCayleyValue(value) ? multiplyScalars(value.magnitude, value.magnitude) : complexNormSquared(value, requireI()),
    cayley: constructCayley,
    cartesian: (value) => cayleyCartesian(value, requireI()),
    magnitude: (value) => isCayleyValue(value) ? value.magnitude : cayleyFromCartesian(value, requireI()).magnitude,
    direction: (value) => isCayleyValue(value) ? value.direction : cayleyFromCartesian(value, requireI()).direction,
    inverse: (value) => isCayleyValue(value) ? inverseCayley(value) : divideScalars(int(1), value)
  };
  const entries2 = new Map([
    ["i", iGenerator],
    ["I", iGenerator],
    ["conjugate", operations.conjugate],
    ["Conjugate", operations.conjugate],
    ["re", operations.re],
    ["Re", operations.re],
    ["im", operations.im],
    ["Im", operations.im],
    ["fromparts", operations.fromParts],
    ["FromParts", operations.fromParts],
    ["normsquared", operations.normSquared],
    ["NormSquared", operations.normSquared],
    ["cayley", operations.cayley],
    ["Cayley", operations.cayley],
    ["cartesian", operations.cartesian],
    ["Cartesian", operations.cartesian],
    ["magnitude", operations.magnitude],
    ["Magnitude", operations.magnitude],
    ["direction", operations.direction],
    ["Direction", operations.direction],
    ["inverse", operations.inverse],
    ["Inverse", operations.inverse],
    ["infinity", CAYLEY_INFINITY],
    ["Infinity", CAYLEY_INFINITY]
  ]);
  return {
    type: "map",
    entries: entries2,
    _ext: new Map([
      ["CONJUGATE", complexMethod("Conjugate", operations.conjugate)],
      ["RE", complexMethod("Re", operations.re)],
      ["IM", complexMethod("Im", operations.im)],
      ["FROMPARTS", complexMethod("FromParts", operations.fromParts)],
      ["NORMSQUARED", complexMethod("NormSquared", operations.normSquared)],
      ["CAYLEY", complexMethod("Cayley", operations.cayley)],
      ["CARTESIAN", complexMethod("Cartesian", operations.cartesian)],
      ["MAGNITUDE", complexMethod("Magnitude", operations.magnitude)],
      ["DIRECTION", complexMethod("Direction", operations.direction)],
      ["INVERSE", complexMethod("Inverse", operations.inverse)],
      ["immutable", int(1)]
    ])
  };
}
function integerExponent(value) {
  if (value instanceof Integer)
    return Number(value.value);
  if (typeof value === "number" && Number.isInteger(value))
    return value;
  if (typeof value === "bigint")
    return Number(value);
  throw new Error("Exact expression exponent must be an integer");
}
function powScalar(value, exponentValue) {
  const exponent = integerExponent(exponentValue);
  if (exponent === 0)
    return int(1);
  if (exponent < 0)
    return divideScalars(int(1), powScalar(value, -exponent));
  let result = int(1);
  let factor = value;
  let n = exponent;
  while (n > 0) {
    if (n % 2 === 1)
      result = multiplyScalars(result, factor);
    n = Math.floor(n / 2);
    if (n)
      factor = multiplyScalars(factor, factor);
  }
  return result;
}
function termsEqual(left, right) {
  const a = toTerms(left);
  const b = toTerms(right);
  if (a.size !== b.size)
    return false;
  for (const [key2, term] of a) {
    const other = b.get(key2);
    if (!other)
      return false;
    const [leftNumerator, leftDenominator] = rationalParts(term.coefficient);
    const [rightNumerator, rightDenominator] = rationalParts(other.coefficient);
    if (leftNumerator * rightDenominator !== rightNumerator * leftDenominator)
      return false;
  }
  return true;
}
function equalScalars(left, right) {
  if (!isExactValue(left) && !isExactValue(right)) {
    const [leftNumerator, leftDenominator] = rationalParts(rationalFrom(left));
    const [rightNumerator, rightDenominator] = rationalParts(rationalFrom(right));
    return leftNumerator * rightDenominator === rightNumerator * leftDenominator;
  }
  return termsEqual(left, right);
}
function sortedTerms(value) {
  return [...toTerms(value).values()].sort((a, b) => {
    if (a.powers.size === 0)
      return -1;
    if (b.powers.size === 0)
      return 1;
    const an = [...a.powers.keys()].map((generator) => generator.name).join("*");
    const bn = [...b.powers.keys()].map((generator) => generator.name).join("*");
    return an.localeCompare(bn);
  });
}
function formatMonomial(powers) {
  return [...powers.entries()].sort(([a], [b]) => a.name.localeCompare(b.name)).map(([generator, exponent]) => exponent === 1 ? generator.name : `${generator.name}^${exponent}`).join("*");
}
function formatExact(value, formatScalar = (scalar) => scalar.toString()) {
  if (value?.type === "exact_generator")
    return `1~{${value.name}}`;
  const pieces = [];
  for (const term of sortedTerms(value)) {
    const negative = isNegative(term.coefficient);
    const coefficient = absRational(term.coefficient);
    const monomial = formatMonomial(term.powers);
    const body = monomial ? `${isOne(coefficient) ? "1" : formatScalar(coefficient)}~{${monomial}}` : formatScalar(coefficient);
    if (pieces.length === 0)
      pieces.push(negative ? `-${body}` : body);
    else
      pieces.push(`${negative ? "-" : "+"} ${body}`);
  }
  return pieces.join(" ");
}
var canonicalPi = createExactGenerator("pi", { id: "exact:pi", category: "transcendental" });
function exactPi() {
  return canonicalPi;
}
function isExactPi(value) {
  return value === canonicalPi;
}
function createDefaultExactCollection() {
  const pi = exactPi();
  const e = createExactGenerator("e", { id: "exact:e", category: "transcendental" });
  const i = createExactGenerator("i", {
    id: "exact:i",
    category: "algebraic",
    minimalPolynomial: [int(1), int(0), int(1)]
  });
  const sqrt2 = exactSquareRoot(int(2));
  return {
    type: "map",
    entries: new Map([["pi", pi], ["e", e], ["i", i], ["sqrt2", sqrt2]]),
    _ext: new Map([["immutable", int(1)]])
  };
}
function exactGeneratorFromPolynomial(name, coefficients) {
  const values = coefficients?.type === "sequence" ? coefficients.values : coefficients;
  if (!Array.isArray(values))
    throw new Error("DefineExactGenerator expects an array of polynomial coefficients");
  return createExactGenerator(name, { category: "algebraic", minimalPolynomial: values });
}

// ../../rix/src/runtime/math-constant.js
var rationalKey = (value) => {
  if (value instanceof Integer)
    return `${value.value}/1`;
  if (!(value instanceof Rational) || value.denominator === 0n)
    throw new Error("Expression constant provider requires finite rational components");
  return `${value.numerator}/${value.denominator}`;
};
var isExpressionScalar = (value) => value instanceof Integer || value instanceof Rational || value instanceof RationalInterval || isExactValue(value) || !!realConstantState(value);
function constantKey(value) {
  const real = realConstantState(value);
  if (real)
    return ["refinableReal", real.id];
  if (value instanceof Integer || value instanceof Rational)
    return ["rational", rationalKey(value)];
  if (value instanceof RationalInterval)
    return ["interval", rationalKey(value.start), rationalKey(value.end)];
  if (value?.type === "exact_generator")
    return ["exactGenerator", value.id];
  if (value?.type === "exact_expression")
    return ["exactExpression", [...value.terms.values()].map((term) => [
      rationalKey(term.coefficient),
      [...term.powers].map(([generator, exponent]) => [generator.id, exponent]).sort((a, b) => a[0].localeCompare(b[0]))
    ]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))];
  throw new Error("Expression constant requires a supported core scalar provider (Integer, Rational, RationalInterval, or exact scalar)");
}
function isEnclosureConstant(value) {
  return value instanceof RationalInterval;
}
function constantEquality(left, right) {
  const aReal = realConstantState(left), bReal = realConstantState(right);
  if (aReal || bReal) {
    if (aReal && bReal && aReal.id === bReal.id)
      return true;
    return null;
  }
  if (left instanceof RationalInterval || right instanceof RationalInterval) {
    const interval2 = (value) => value instanceof RationalInterval ? value : value instanceof Integer || value instanceof Rational ? new RationalInterval(value, value) : null;
    const a = interval2(left), b = interval2(right);
    if (!a || !b)
      return null;
    if (a.high.lessThan(b.low) || b.high.lessThan(a.low))
      return false;
    if (a.low.equals(a.high) && b.low.equals(b.high))
      return a.low.equals(b.low);
    return null;
  }
  if (!isExpressionScalar(left) || !isExpressionScalar(right))
    return null;
  if (equalScalars(left, right))
    return true;
  return isExactValue(left) || isExactValue(right) ? null : false;
}
function constantProviderInfo(value) {
  constantKey(value);
  const interval2 = isEnclosureConstant(value), exact3 = isExactValue(value), real = realConstantState(value);
  const text4 = (value2) => ({ type: "string", value: value2 });
  const decision = (value2) => value2 ? new Integer(1n) : null;
  return { type: "map", entries: new Map([
    ["schema", text4("rix.math.constant-provider@1")],
    ["provider", text4(real ? real.source ? "refinableReal" : "realSnapshot" : interval2 ? "rationalInterval" : exact3 ? "exactScalar" : "rational")],
    ["denotation", text4(interval2 ? "setEnclosure" : "singleton")],
    ["exact", decision(!interval2)],
    ["refinable", decision(!!real?.source)],
    ["commutative", new Integer(1n)],
    ["associative", new Integer(1n)],
    ["distributive", decision(!interval2)],
    ["cancellation", exact3 ? UNDECIDED : decision(!interval2)],
    ["enclosure", real ? real.interval : interval2 ? value : null],
    ["evidencelevel", real ? real.evidence : null],
    ["validation", real ? text4(real.source ? "protocolChecked" : "unverifiedImport") : null],
    ["savedevidencelevel", real?.savedEvidence ? text4(real.savedEvidence) : null],
    ["laststatus", real ? text4(refinementEntry(real.result, "status")?.value) : null],
    ["lastgoalmet", real ? decision(refinementEntry(real.result, "goalmet")?.value === 1n) : null]
  ]), _ext: new Map([["immutable", new Integer(1n)]]) };
}

// ../../rix/src/runtime/math-expression.js
var EXPRESSION_SCHEMA = "rix.calculus.expression@1";
var expressionField = (value, key2) => value?.entries?.get(key2.toLowerCase());
var string = (value) => ({ type: "string", value });
var nextSymbolId = 1;
var SYMBOLS = "__math_symbols__";
var DEFINITION_TOKEN = "__math_definition_token";
var definitions = new WeakMap;
function initializeSymbolScope(environment) {
  if (!environment.has(SYMBOLS))
    environment.set(SYMBOLS, new Map);
  return environment;
}
function scopedExpressionVariable(context, name, outer = false) {
  const environments = [context.globalScopedEnv, ...context.localScopes.map((scope) => scope.scopedEnv)];
  if (outer) {
    for (let i = environments.length - 2;i >= 0; i--) {
      const symbol = environments[i].get(SYMBOLS)?.get(name);
      if (symbol)
        return symbol;
    }
    throw new Error(`No enclosing symbolic variable ::${name}`);
  }
  const environment = environments.at(-1);
  initializeSymbolScope(environment);
  const symbols2 = environment.get(SYMBOLS);
  if (!symbols2.has(name)) {
    if (context.localScopes.at(-1)?.readOnly || !context.localScopes.length && context.globalReadOnly)
      throw new Error("Cannot introduce a symbol in a read-only scope");
    const symbol = freshExpressionSymbol(name);
    symbols2.set(name, symbol);
  }
  return symbols2.get(name);
}
function freshExpressionSymbol(name, bound = false) {
  const symbol = expressionRecord("variable", [
    ["name", string(name)],
    ["symbolid", string(`symbol:${nextSymbolId++}`)],
    ...bound ? [["bound", new Integer(1n)]] : []
  ]);
  const token = () => {
    throw new Error("Opaque mathematical identity is not callable");
  };
  definitions.set(token, { value: null, id: expressionField(symbol, "symbolid").value, name });
  symbol._ext.set(DEFINITION_TOKEN, token);
  return symbol;
}
function symbolState(symbol) {
  const id = expressionField(symbol, "symbolid")?.value;
  if (!id)
    return null;
  const state = definitions.get(symbol?._ext?.get(DEFINITION_TOKEN));
  if (!isMathExpression(symbol) || expressionField(symbol, "kind")?.value !== "variable" || !state || state.id !== id || state.name !== expressionField(symbol, "name")?.value) {
    throw new Error("Invalid scoped symbol identity");
  }
  return state;
}
function expressionDefinition(symbol) {
  return symbolState(symbol)?.value ?? null;
}
function restoreExpressionDefinition(symbol, value) {
  const state = symbolState(symbol);
  if (!state || state.value || expressionField(symbol, "bound"))
    throw new Error("Invalid saved symbolic definition");
  const expression = promoteExpression(value);
  if (referencesSymbol(expression, state.id))
    throw new Error("Cyclic saved symbolic definition");
  state.value = expression;
}
function referencesSymbol(expression, id, seen = new Set) {
  if (!isMathExpression(expression) || seen.has(expression))
    return false;
  seen.add(expression);
  if (expressionField(expression, "symbolid")?.value === id)
    return true;
  const definition = expressionDefinition(expression);
  if (definition && referencesSymbol(definition, id, seen))
    return true;
  return ["operands", "arguments"].some((key2) => expressionField(expression, key2)?.values?.some((value) => referencesSymbol(value, id, seen)));
}
function defineExpressionSymbol(name, node, context, evaluate) {
  if (context.localScopes.at(-1)?.readOnly || !context.localScopes.length && context.globalReadOnly)
    throw new Error("Cannot define a symbol in a read-only scope");
  const symbol = scopedExpressionVariable(context, name);
  const state = definitions.get(symbol._ext.get(DEFINITION_TOKEN));
  if (state.value)
    throw new Error(`Symbolic definition ::${name} is immutable`);
  const finish = (value2) => {
    if (state.value)
      throw new Error(`Symbolic definition ::${name} is immutable`);
    const expression = promoteExpression(value2);
    if (referencesSymbol(expression, expressionField(symbol, "symbolid").value))
      throw new Error(`Cyclic symbolic definition for ::${name}`);
    state.value = expression;
    return symbol;
  };
  const value = evaluate(node, context);
  return value instanceof Promise ? value.then(finish) : finish(value);
}
function expandExpression(expression, memo = new Map) {
  expression = promoteExpression(expression);
  if (memo.has(expression))
    return memo.get(expression);
  const definition = expressionDefinition(expression);
  if (definition) {
    const result2 = expandExpression(definition, memo);
    memo.set(expression, result2);
    return result2;
  }
  const kind = expressionField(expression, "kind")?.value;
  let result = expression;
  if (kind === "operator")
    result = expressionOperation(expressionField(expression, "operation").value, expressionField(expression, "operands").values.map((value) => expandExpression(value, memo)));
  if (kind === "apply")
    result = expressionApplication(expressionField(expression, "semanticid").value, expressionField(expression, "name").value, expressionField(expression, "arguments").values.map((value) => expandExpression(value, memo)));
  memo.set(expression, result);
  return result;
}
function equalityTree(expression) {
  const operation = expressionField(expression, "operation")?.value;
  if (!operation)
    return expressionStructuralTree(expression);
  const operands = expressionField(expression, "operands").values;
  const keys = operands.map(equalityTree);
  const isNumber = (tree2, value) => tree2?.[0] === "constant" && tree2[1]?.[0] === "rational" && tree2[1][1] === `${value}/1`;
  if (["add", "subtract"].includes(operation) && isNumber(keys[1], 0))
    return keys[0];
  if (operation === "add" && isNumber(keys[0], 0))
    return keys[1];
  if (["multiply", "divide", "power"].includes(operation) && isNumber(keys[1], 1))
    return keys[0];
  if (operation === "multiply" && isNumber(keys[0], 1))
    return keys[1];
  return ["operator", operation, keys];
}
var equalityKey = (expression) => JSON.stringify(equalityTree(expression));
function hasScopedSymbols(expression) {
  if (!isMathExpression(expression))
    return false;
  if (expressionField(expression, "symbolid"))
    return true;
  return ["operands", "arguments"].some((key2) => expressionField(expression, key2)?.values?.some(hasScopedSymbols));
}
function hasExtendedConstants(expression) {
  if (!isMathExpression(expression))
    return false;
  if (expressionField(expression, "kind")?.value === "constant") {
    const value = expressionField(expression, "value");
    return !(value instanceof Integer || value instanceof Rational);
  }
  return ["operands", "arguments"].some((key2) => expressionField(expression, key2)?.values?.some(hasExtendedConstants));
}
function hasEnclosures(expression) {
  if (expressionField(expression, "kind")?.value === "constant")
    return isEnclosureConstant(expressionField(expression, "value"));
  return ["operands", "arguments"].some((key2) => expressionField(expression, key2)?.values?.some(hasEnclosures));
}
function expressionStructuralKey(expression) {
  return JSON.stringify(expressionStructuralTree(expression));
}
function expressionStructuralTree(expression) {
  if (!isMathExpression(expression))
    return expressionStructuralTree(expressionConstant(expression));
  const kind = expressionField(expression, "kind")?.value;
  if (kind === "variable")
    return [kind, symbolState(expression)?.id ?? ["named", expressionField(expression, "name")?.value]];
  if (kind === "constant")
    return [kind, constantKey(expressionField(expression, "value"))];
  if (kind === "operator")
    return [kind, expressionField(expression, "operation")?.value, expressionField(expression, "operands").values.map(expressionStructuralTree)];
  if (kind === "apply")
    return [kind, expressionField(expression, "semanticid")?.value, expressionField(expression, "arguments").values.map(expressionStructuralTree)];
  throw new Error("Unsupported mathematical expression kind");
}
function isMathExpression(value) {
  return value?.type === "map" && expressionField(value, "schema")?.value === EXPRESSION_SCHEMA;
}
function expressionRecord(kind, fields = []) {
  const method4 = (name, fn) => ({ type: "method_builtin", name, impl: (args) => fn(args[0]) });
  const proto = { type: "map", entries: new Map([
    ["RECORD", method4("Record", (self) => self)],
    ["KIND", method4("Kind", (self) => expressionField(self, "kind"))],
    ["OPERANDS", method4("Operands", (self) => expressionField(self, "operands") || { type: "sequence", values: [] })],
    ["SEMANTICID", method4("SemanticId", (self) => expressionField(self, "semanticid") || null)]
  ]) };
  proto.entries.set("SYMBOLID", method4("SymbolId", (self) => expressionField(self, "symbolid") || null));
  for (const [name, capability] of [["Eval", "MathEvaluate"], ["Substitute", "MathSubstitute"]]) {
    proto.entries.set(name.toUpperCase(), {
      type: "method_builtin",
      name,
      impl: (args, context, evaluate) => evaluate({ fn: "SYS_CALL", args: [capability, ...args] }, context)
    });
  }
  const record2 = {
    type: "map",
    entries: new Map([
      ["valuekind", string("calculusExpression")],
      ["schema", string(EXPRESSION_SCHEMA)],
      ["kind", string(kind)],
      ...fields
    ]),
    _ext: new Map([
      ["__type", string("CalculusExpression")],
      ["_type", string("calculus_expression")],
      ["immutable", new Integer(1n)],
      ["_proto", proto]
    ])
  };
  return record2;
}
function expressionVariable(name) {
  const text4 = typeof name === "string" ? name : name?.type === "string" ? name.value : null;
  if (!text4)
    throw new Error("Expression variable name must be a nonempty string");
  return expressionRecord("variable", [["name", string(text4)]]);
}
function expressionConstant(value) {
  constantKey(value);
  return expressionRecord("constant", [["value", value]]);
}
function promoteExpression(value) {
  return isMathExpression(value) ? value : expressionConstant(value);
}
function expressionOperation(operation, operands) {
  const arity = { add: 2, subtract: 2, multiply: 2, divide: 2, power: 2, negate: 1 }[operation];
  if (!arity || !Array.isArray(operands) || operands.length !== arity)
    throw new Error("Invalid expression operator or arity");
  return expressionRecord("operator", [
    ["operation", string(operation)],
    ["operands", { type: "sequence", values: operands.map(promoteExpression) }]
  ]);
}
function expressionApplication(semanticId, name, args) {
  return expressionRecord("apply", [
    ["semanticid", string(semanticId)],
    ["name", string(name)],
    ["arguments", { type: "sequence", values: args.map(promoteExpression) }]
  ]);
}
function installExpressionVariants(registry2) {
  for (const [fn, operation] of Object.entries({ ADD: "add", SUB: "subtract", MUL: "multiply", DIV: "divide", POW: "power", NEG: "negate" })) {
    registry2.installVariant(fn, {
      name: `CoreExpression_${fn}`,
      priority: 250,
      prep: (args) => args.length === (fn === "NEG" ? 1 : 2) && args.some(isMathExpression),
      impl: (args) => expressionOperation(operation, args)
    });
  }
  for (const operation of ["EQ", "NEQ"])
    registry2.installVariant(operation, {
      name: `CoreExpression_${operation}`,
      priority: 250,
      prep: (args) => args.some(isMathExpression),
      impl: (args) => {
        if (args.some((value) => value === null))
          return operation === "EQ" ? null : new Integer(1n);
        if (!args.every((value) => isMathExpression(value) || isExpressionScalar(value)))
          return UNDECIDED;
        const expanded = args.map((value) => expandExpression(value));
        if (expanded.every((value) => expressionField(value, "kind")?.value === "constant")) {
          const equal = constantEquality(...expanded.map((value) => expressionField(value, "value")));
          return equal === null ? UNDECIDED : equal === (operation === "EQ") ? new Integer(1n) : null;
        }
        if (expanded.some(hasEnclosures))
          return UNDECIDED;
        if (equalityKey(expanded[0]) === equalityKey(expanded[1]))
          return operation === "EQ" ? new Integer(1n) : null;
        return UNDECIDED;
      }
    });
}
var expressionSyntaxFunctions = {
  SYMBOL_RETRIEVE: { impl: ([name, outer], context) => scopedExpressionVariable(context, name, outer), lazy: true, pure: false },
  SYMBOL_DEFINE: { impl: ([name, node], context, evaluate) => defineExpressionSymbol(name, node, context, evaluate), lazy: true, pure: false }
};
var expressionCapabilities = {
  ExpressionVariableSelector: { impl: ([expression, selector]) => {
    if (selector?.type === "string") {
      if (hasScopedSymbols(expression))
        throw new Error("Scoped expressions require an explicit symbolic variable, not a name string");
      return selector;
    }
    if (!isMathExpression(selector) || expressionField(selector, "kind")?.value !== "variable")
      throw new Error("Expected a symbolic variable or name string");
    if (expressionDefinition(selector))
      throw new Error("A defined symbol is not an independent differentiation/integration variable");
    return selector;
  }, pure: false, groups: ["Symbolic"], doc: "Validate an identity-preserving mathematical variable selector" },
  ExpressionVariableMatches: { impl: ([left, right]) => {
    if (!isMathExpression(left) || expressionField(left, "kind")?.value !== "variable")
      return null;
    const a = symbolState(left)?.id;
    if (right?.type === "string")
      return !a && expressionField(left, "name")?.value === right.value ? new Integer(1n) : null;
    if (!isMathExpression(right) || expressionField(right, "kind")?.value !== "variable")
      throw new Error("Expected a symbolic variable selector");
    const b = symbolState(right)?.id;
    return (a || b ? a === b : expressionField(left, "name")?.value === expressionField(right, "name")?.value) ? new Integer(1n) : null;
  }, pure: true, groups: ["Symbolic"], doc: "Compare variable identities without conflating same-spelled scoped symbols" },
  ExpressionReal: { impl: ([source, options], context, evaluate) => {
    const adapted = adaptRealConstant(source, options, context, evaluate);
    return adapted instanceof Promise ? adapted.then(expressionConstant) : expressionConstant(adapted);
  }, pure: false, groups: ["Symbolic"], doc: "Adapt a certified singleton provider with one bounded initial refinement" },
  ExpressionRefine: { impl: ([value, options], context, evaluate) => refineRealConstant(isMathExpression(value) && expressionField(value, "kind")?.value === "constant" ? expressionField(value, "value") : value, options, context, evaluate), pure: false, groups: ["Symbolic"], doc: "Explicitly refine an adapted real constant and check its enclosure" },
  ExpressionConstantInfo: { impl: ([value]) => constantProviderInfo(isMathExpression(value) && expressionField(value, "kind")?.value === "constant" ? expressionField(value, "value") : value), pure: false, groups: ["Symbolic"], doc: "Inspect core constant denotation and algebraic laws without refinement" },
  ExpressionHasExtendedConstants: { impl: ([value]) => hasExtendedConstants(value) ? new Integer(1n) : null, pure: true, groups: ["Symbolic"], doc: "Recognize constants requiring provider-aware consumers" },
  ExpressionDefinition: { impl: ([symbol]) => {
    if (!expressionField(symbol, "symbolid"))
      throw new Error("ExpressionDefinition requires a scoped symbol");
    return expressionDefinition(symbol);
  }, pure: false, groups: ["Symbolic"], doc: "Inspect a symbol's immutable definition, or null if it has none" },
  ExpressionExpand: { impl: ([value]) => expandExpression(value), pure: false, groups: ["Symbolic"], doc: "Expand immutable symbol definitions without changing identities or applying general simplification" },
  ExpressionKey: { impl: ([value]) => string(expressionStructuralKey(value)), pure: true, groups: ["Symbolic"], doc: "Identity-aware structural key, not a proof of mathematical inequality" },
  ExpressionHasScopedSymbols: { impl: ([value]) => hasScopedSymbols(value) ? new Integer(1n) : null, pure: true, groups: ["Symbolic"], doc: "Recognize expressions requiring identity-aware mathematical consumers" },
  SameSymbol: { impl: ([left, right]) => {
    const a = symbolState(left)?.id, b = symbolState(right)?.id;
    if (!a || !b)
      throw new Error("SameSymbol requires two scoped symbolic variables");
    return a === b ? new Integer(1n) : null;
  }, pure: true, groups: ["Symbolic"], doc: "Compare symbol identities independently of mathematical equality" },
  ExpressionVariable: { impl: ([name]) => expressionVariable(name), pure: true, groups: ["Symbolic"], doc: "Construct a mathematical variable expression without loading a plugin" },
  ExpressionConstant: { impl: ([value]) => expressionConstant(value), pure: true, groups: ["Symbolic"], doc: "Construct a mathematical constant from a supported core scalar provider" },
  ExpressionOperation: { impl: ([operation, operands]) => expressionOperation(operation?.value, operands?.values), pure: true, groups: ["Symbolic"], doc: "Construct a validated mathematical arithmetic node" },
  ExpressionApply: { impl: ([id, name, args]) => {
    if (id?.type !== "string" || name?.type !== "string" || !Array.isArray(args?.values))
      throw new Error("ExpressionApply requires semantic ID, name, and arguments");
    return expressionApplication(id.value, name.value, args.values);
  }, pure: true, groups: ["Symbolic"], doc: "Construct a mathematical function application" },
  IsExpression: { impl: ([value]) => isMathExpression(value) ? new Integer(1n) : null, pure: true, groups: ["Symbolic"], doc: "Recognize a core mathematical expression" }
};

// ../../rix/src/runtime/math-json.js
var MATH_DOCUMENT_SCHEMA = "rix.math.document@1";
var MAX_TEXT = 2000000;
var MAX_NODES = 1e4;
var MAX_DEPTH = 128;
var MAX_DIGITS = 1024;
var fail4 = (message) => {
  throw new Error(`Mathematical JSON: ${message}`);
};
var text4 = (value) => ({ type: "string", value });
var immutable = (entries2) => attachMathContextMethods({ type: "map", entries: new Map(entries2), _ext: new Map([["immutable", new Integer(1n)]]) });
function fields(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some((key2) => !Object.hasOwn(value, key2)))
    fail4("unexpected or missing fields");
}
function string2(value) {
  if (typeof value !== "string" || value.length > MAX_TEXT)
    fail4("invalid string");
  return value;
}
function integer2(value) {
  if (typeof value !== "string" || value.length > MAX_DIGITS || !/^(0|-?[1-9][0-9]*)$/.test(value))
    fail4("invalid or oversized integer");
  return BigInt(value);
}
function list(value) {
  if (!Array.isArray(value) || value.length > MAX_NODES)
    fail4("invalid or oversized array");
  return value;
}
function exact3(value) {
  if (!(value instanceof Integer || value instanceof Rational))
    fail4("expected exact scalar");
  return value;
}
function safeTree(value, depth = 0) {
  if (depth > MAX_DEPTH)
    fail4("nesting budget exceeded");
  if (value && typeof value === "object")
    for (const item of Object.values(value))
      safeTree(item, depth + 1);
}
function encodeMathematicalJSON(root) {
  const nodes = [], identities = new Map, objects = new Map;
  function encode(value, depth = 0) {
    if (depth > MAX_DEPTH)
      fail4("graph depth budget exceeded");
    if (value === null)
      return null;
    if (value === UNDECIDED)
      return { $undecided: true };
    if (value instanceof Integer) {
      integer2(String(value.value));
      return { $integer: String(value.value) };
    }
    if (value instanceof Rational) {
      if (value.denominator === 0n)
        fail4("nonfinite rational");
      integer2(String(value.numerator));
      integer2(String(value.denominator));
      return { $rational: [String(value.numerator), String(value.denominator)] };
    }
    if (value?.type === "string")
      return { $string: value.value };
    if (!value || typeof value !== "object")
      fail4("unsupported value or callable");
    const kind = isMathExpression(value) ? expressionField(value, "kind")?.value : null;
    const real = realConstantState(value);
    const identity = kind === "variable" ? `symbol:${expressionStructuralKey(value)}` : real ? `real:${real.id}` : value.type === "exact_generator" ? `generator:${value.id}` : null;
    if (identity && identities.has(identity))
      return { $ref: identities.get(identity) };
    if (objects.has(value))
      return { $ref: objects.get(value) };
    if (nodes.length >= MAX_NODES)
      fail4("node budget exceeded");
    const id = `n${nodes.length}`, node = { id };
    nodes.push(node);
    objects.set(value, id);
    if (identity)
      identities.set(identity, id);
    const child = (value2) => encode(value2, depth + 1);
    if (kind === "variable")
      Object.assign(node, { kind: "symbol", name: expressionField(value, "name").value, bound: !!expressionField(value, "bound"), definition: child(expressionDefinition(value)) });
    else if (kind === "constant")
      Object.assign(node, { kind, value: child(expressionField(value, "value")) });
    else if (kind === "operator")
      Object.assign(node, { kind, operation: expressionField(value, "operation").value, operands: expressionField(value, "operands").values.map(child) });
    else if (kind === "apply")
      Object.assign(node, { kind, semanticId: expressionField(value, "semanticid").value, name: expressionField(value, "name").value, arguments: expressionField(value, "arguments").values.map(child) });
    else if (value instanceof RationalInterval)
      Object.assign(node, { kind: "interval", start: child(value.start), end: child(value.end) });
    else if (real?.interchange)
      Object.assign(node, { kind: "real", envelope: JSON.parse(encodeRefinableReal(value)) });
    else if (real)
      Object.assign(node, { kind: "real", envelope: {
        schema: "rix.refinable-real@1",
        subject: { kind: "opaqueSingleton", stableName: id },
        snapshot: {
          interval: { $interval: [child(real.interval.low), child(real.interval.high)] },
          status: real.source ? "certified" : "assumed",
          evidenceLevel: real.savedEvidence || real.evidence?.value || "declared",
          verification: "unavailable",
          evidence: [],
          achievedWidth: child(real.interval.high.subtract(real.interval.low)),
          work: { calls: "0", iterations: "0" }
        },
        recipe: null
      } });
    else if (isExactPi(value))
      Object.assign(node, { kind: "namedConstant", semanticId: "rix.constant.pi@1" });
    else if (value.type === "exact_generator")
      Object.assign(node, {
        kind: "generator",
        name: value.name,
        category: value.category,
        real: value.real,
        positiveRoot: value.positiveRoot,
        polynomial: value.minimalPolynomial ? value.minimalPolynomial.map(child) : null
      });
    else if (value.type === "exact_expression")
      Object.assign(node, { kind: "exact", terms: [...value.terms.values()].map((term) => ({ coefficient: child(term.coefficient), powers: [...term.powers].map(([g, e]) => [child(g), e]) })) });
    else if (["tuple", "sequence"].includes(value.type))
      Object.assign(node, { kind: value.type, values: list(value.values).map(child) });
    else if (value.type === "map")
      Object.assign(node, { kind: "map", entries: list([...value.entries]).map(([key2, item]) => [string2(key2), child(item)]) });
    else
      fail4(`unsupported value type ${value.type || "object"}`);
    return { $ref: id };
  }
  const doc = { schema: MATH_DOCUMENT_SCHEMA, root: encode(root), nodes };
  const output = JSON.stringify(doc);
  validateDocument(output);
  return output;
}
function validateDocument(source) {
  if (typeof source !== "string" || source.length > MAX_TEXT)
    fail4("text budget exceeded or non-string input");
  let doc;
  try {
    doc = JSON.parse(source);
  } catch {
    fail4("invalid JSON");
  }
  safeTree(doc);
  fields(doc, ["schema", "root", "nodes"]);
  if (doc.schema !== MATH_DOCUMENT_SCHEMA)
    fail4("unsupported document version");
  const table = new Map;
  for (const node of list(doc.nodes)) {
    if (!node || typeof node.id !== "string" || !/^n[0-9]+$/.test(node.id) || table.has(node.id))
      fail4("invalid or duplicate node ID");
    table.set(node.id, node);
  }
  const visited = new Set, active = new Set;
  function scan(value, depth = 0) {
    if (depth > MAX_DEPTH)
      fail4("graph depth budget exceeded");
    if (!value || typeof value !== "object")
      return;
    if (Object.hasOwn(value, "$ref")) {
      fields(value, ["$ref"]);
      const id = value.$ref;
      if (!table.has(id))
        fail4("dangling reference");
      if (active.has(id))
        fail4("cyclic graph or definition");
      if (visited.has(id))
        return;
      active.add(id);
      scan(table.get(id), depth + 1);
      active.delete(id);
      visited.add(id);
      return;
    }
    if (value.kind === "real" && table.get(value.id) === value)
      return;
    for (const child of Object.values(value))
      scan(child, depth + 1);
  }
  scan(doc.root);
  for (const id of table.keys())
    scan({ $ref: id });
  const weights = new Map;
  function weight(value) {
    if (!value || typeof value !== "object")
      return { size: 1, height: 1 };
    if (Object.hasOwn(value, "$ref")) {
      if (!weights.has(value.$ref))
        weights.set(value.$ref, weight(table.get(value.$ref)));
      return weights.get(value.$ref);
    }
    if (value.kind === "real" && table.get(value.id) === value) {
      let plain = function(item) {
        if (!item || typeof item !== "object")
          return { size: 1, height: 1 };
        let size = 1, height2 = 1;
        for (const entry of Object.values(item)) {
          const child = plain(entry);
          size += child.size;
          height2 = Math.max(height2, child.height + 1);
          if (size > 1e5 || height2 > MAX_DEPTH)
            fail4("expanded graph budget exceeded");
        }
        return { size, height: height2 };
      };
      return plain(value);
    }
    let total = 1, height = 1;
    for (const child of Object.values(value)) {
      const nested = weight(child);
      total += nested.size;
      height = Math.max(height, nested.height + 1);
      if (total > 1e5 || height > MAX_DEPTH)
        fail4("expanded graph budget exceeded");
    }
    return { size: total, height };
  }
  weight(doc.root);
  for (const id of table.keys())
    weight({ $ref: id });
  return { doc, table };
}
function decodeMathematicalJSON(source) {
  const { doc, table } = validateDocument(source), memo = new Map;
  function decode(value, depth = 0) {
    if (depth > MAX_DEPTH)
      fail4("graph depth budget exceeded");
    if (value === null)
      return null;
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail4("expected tagged value");
    const keys = Object.keys(value);
    if (keys.length !== 1)
      fail4("invalid value tag");
    if (keys[0] === "$integer")
      return new Integer(integer2(value.$integer));
    if (keys[0] === "$rational") {
      const parts = list(value.$rational);
      if (parts.length !== 2)
        fail4("invalid rational");
      const n2 = integer2(parts[0]), d = integer2(parts[1]);
      if (d <= 0n)
        fail4("nonpositive denominator");
      const rational2 = new Rational(n2, d);
      if (rational2.numerator !== n2 || rational2.denominator !== d)
        fail4("noncanonical rational");
      return rational2;
    }
    if (keys[0] === "$string")
      return text4(string2(value.$string));
    if (keys[0] === "$undecided" && value.$undecided === true)
      return UNDECIDED;
    if (keys[0] !== "$ref" || !table.has(value.$ref))
      fail4("unknown tag or reference");
    if (memo.has(value.$ref))
      return memo.get(value.$ref);
    const n = table.get(value.$ref), child = (value2) => decode(value2, depth + 1);
    const shape2 = (...names) => fields(n, ["id", "kind", ...names]);
    let result;
    switch (n.kind) {
      case "symbol": {
        shape2("name", "bound", "definition");
        string2(n.name);
        if (!n.name || typeof n.bound !== "boolean")
          fail4("invalid symbol");
        result = freshExpressionSymbol(n.name, n.bound);
        if (n.definition !== null)
          restoreExpressionDefinition(result, child(n.definition));
        break;
      }
      case "constant":
        shape2("value");
        result = expressionConstant(child(n.value));
        break;
      case "operator":
        shape2("operation", "operands");
        result = expressionOperation(string2(n.operation), list(n.operands).map(child));
        break;
      case "apply":
        shape2("semanticId", "name", "arguments");
        result = expressionApplication(string2(n.semanticId), string2(n.name), list(n.arguments).map(child));
        break;
      case "interval":
        shape2("start", "end");
        result = new RationalInterval(exact3(child(n.start)), exact3(child(n.end)));
        break;
      case "namedConstant": {
        shape2("semanticId");
        if (n.semanticId !== "rix.constant.pi@1")
          fail4("unknown named constant semantic ID");
        result = exactPi();
        break;
      }
      case "generator": {
        shape2("name", "category", "real", "positiveRoot", "polynomial");
        if (typeof n.real !== "boolean" || typeof n.positiveRoot !== "boolean")
          fail4("invalid generator flags");
        const polynomial = n.polynomial === null ? null : list(n.polynomial).map((value2) => exact3(child(value2)));
        if (polynomial && polynomial.length > 64)
          fail4("generator degree budget exceeded");
        result = createExactGenerator(string2(n.name), { category: string2(n.category), real: n.real, positiveRoot: n.positiveRoot, minimalPolynomial: polynomial });
        break;
      }
      case "exact": {
        shape2("terms");
        const terms = new Map;
        for (const term of list(n.terms)) {
          fields(term, ["coefficient", "powers"]);
          const coefficient = exact3(child(term.coefficient)), powers = new Map;
          for (const pair of list(term.powers)) {
            if (!Array.isArray(pair) || pair.length !== 2)
              fail4("invalid generator power");
            const generator = child(pair[0]), exponent = pair[1];
            if (generator?.type !== "exact_generator" || !Number.isSafeInteger(exponent) || exponent < 1 || exponent > 1e4 || powers.has(generator))
              fail4("invalid generator power");
            powers.set(generator, exponent);
          }
          const key2 = [...powers].sort(([a], [b]) => a.id.localeCompare(b.id)).map(([g, e]) => `${g.id}^${e}`).join("|");
          if (terms.has(key2))
            fail4("duplicate exact term");
          terms.set(key2, { coefficient, powers });
        }
        result = { type: "exact_expression", terms };
        break;
      }
      case "real": {
        shape2("envelope");
        result = decodeRefinableReal(JSON.stringify(n.envelope));
        break;
      }
      case "tuple":
      case "sequence":
        shape2("values");
        result = { type: n.kind, values: list(n.values).map(child) };
        break;
      case "map": {
        shape2("entries");
        const entries2 = new Map;
        for (const pair of list(n.entries)) {
          if (!Array.isArray(pair) || pair.length !== 2 || entries2.has(string2(pair[0])))
            fail4("invalid or duplicate map key");
          entries2.set(pair[0], child(pair[1]));
        }
        if (entries2.get("schema")?.value === "rix.math.context@1") {
          entries2.set("consistency", text4("unresolved"));
          entries2.set("validation", text4("unverifiedImport"));
        }
        result = immutable(entries2);
        break;
      }
      default:
        fail4("unknown node kind");
    }
    memo.set(n.id, result);
    return result;
  }
  for (const id of table.keys())
    decode({ $ref: id });
  return decode(doc.root);
}
var mathematicalJSONCapabilities = {
  ...realJSONCapabilities,
  MathEncodeJSON: { impl: ([value]) => text4(encodeMathematicalJSON(value)), pure: false, groups: ["Symbolic"], doc: "Encode an inert document-local mathematical graph" },
  MathDecodeJSON: { impl: ([value]) => decodeMathematicalJSON(value?.type === "string" ? value.value : value), pure: false, groups: ["Symbolic"], doc: "Load fresh identities and frozen real snapshots without executing code" },
  MathEncodeJSONL: { impl: ([values]) => {
    if (!["sequence", "tuple"].includes(values?.type) || values.values.length > 1000)
      fail4("JSONL requires at most 1000 values");
    const lines = values.values.map(encodeMathematicalJSON).join(`
`), output = lines ? lines + `
` : "";
    if (output.length > MAX_TEXT)
      fail4("JSONL text budget exceeded");
    return text4(output);
  }, pure: false, groups: ["Symbolic"], doc: "Encode independent mathematical documents, one per line" },
  MathDecodeJSONL: { impl: ([value]) => {
    const source = value?.type === "string" ? value.value : value;
    if (typeof source !== "string" || source.length > MAX_TEXT)
      fail4("JSONL text budget exceeded");
    const lines = source.split(/\r?\n/);
    if (lines.at(-1) === "")
      lines.pop();
    if (lines.length > 1000 || lines.some((line) => !line.trim()))
      fail4("JSONL line budget or blank line");
    return { type: "sequence", values: lines.map((line, index) => {
      try {
        return decodeMathematicalJSON(line);
      } catch (error) {
        fail4(`line ${index + 1}: ${error.message}`);
      }
    }) };
  }, pure: false, groups: ["Symbolic"], doc: "Decode independent bounded JSONL documents without executing code" }
};

// ../../rix/src/runtime/rixcel-workbook.js
var RIXCEL_WORKBOOK_FORMAT = "rixcel-workbook";
var RIXCEL_WORKBOOK_LIMITS = Object.freeze({ documents: 32, nodes: 4096, reads: 50000, evaluations: 8192, sourceLength: 65536, textLength: 8000000, maxSteps: 200000, maxTimeMs: 2000, refreshTimeMs: 5000, refreshConcurrent: 4 });
var fail5 = (message) => {
  throw new Error(`RiX Ripple workbook: ${message}`);
};
var str2 = (value) => value?.type === "string" ? value.value : value;
function identifier(value, label) {
  value = str2(value);
  if (typeof value !== "string" || !value.length || value.length > 128 || /[\u0000-\u001f\u007f]/u.test(value))
    fail5(`${label} must be a string of 1..128 characters`);
  return value;
}
function ownRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    fail5(`${label} must be a plain record`);
  return value;
}
function data(value, depth = 0, seen = new Set) {
  if (depth > 64)
    fail5("data nesting exceeds 64");
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return value;
  if (typeof value === "number" && Number.isFinite(value))
    return value;
  if (!value || typeof value !== "object" || seen.has(value))
    fail5("records must contain acyclic JSON data, not executable values");
  if (!Array.isArray(value))
    ownRecord(value, "data");
  else if (Object.keys(value).length !== value.length || Object.keys(value).some((key2, index) => key2 !== String(index)))
    fail5("arrays must be dense JSON data");
  seen.add(value);
  const entries2 = Object.keys(value).map((key2) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key2);
    if (!Object.hasOwn(descriptor, "value"))
      fail5("accessors are not portable data");
    return [key2, data(descriptor.value, depth + 1, seen)];
  });
  seen.delete(value);
  return Array.isArray(value) ? entries2.map(([, item]) => item) : Object.fromEntries(entries2);
}
var clone2 = (value) => data(value);
function dictionary(value, convert, label) {
  ownRecord(value ?? {}, label);
  const result = Object.create(null);
  for (const [key2, entry] of Object.entries(value ?? {})) {
    const name = identifier(key2, label).toLowerCase();
    if (Object.hasOwn(result, name))
      fail5(`duplicate ${label}: ${name}`);
    result[name] = convert(entry);
  }
  return result;
}
function exactIndex2(value) {
  const number = value instanceof Integer ? Number(value.value) : value instanceof Rational && value.denominator === 1n ? Number(value.numerator) : typeof value === "bigint" ? Number(value) : value;
  if (!Number.isSafeInteger(number))
    fail5("coordinates and offsets must be exact integers");
  return number;
}
function indexOf(value, shape2) {
  if (!Array.isArray(value) || value.length !== shape2.length)
    fail5("slot coordinate rank mismatch");
  return value.map((item, axis) => {
    const n = exactIndex2(item);
    if (!Number.isSafeInteger(n) || n < 1 || n > shape2[axis])
      fail5(`slot coordinate out of bounds on axis ${axis + 1}`);
    return n;
  });
}
function target(value, shape2) {
  ownRecord(value, "definition");
  const keys = ["index", "source", "name"].filter((key2) => Object.hasOwn(value, key2));
  if (keys.length !== 1 || Object.keys(value).length !== 1)
    fail5("definition requires exactly one index, source or owned name");
  if (keys[0] === "index")
    return { index: indexOf(value.index, shape2) };
  if (keys[0] === "name")
    return { name: identifier(value.name, "owned name").toLowerCase() };
  if (typeof value.source !== "string" || !value.source.trim() || value.source.length > RIXCEL_WORKBOOK_LIMITS.sourceLength)
    fail5("definition source is empty or exceeds its limit");
  return { source: value.source };
}
function parseRixCelWorkbook(input) {
  if (typeof input === "string") {
    if (input.length > RIXCEL_WORKBOOK_LIMITS.textLength)
      fail5("workbook text limit exceeded");
    input = JSON.parse(input);
  }
  input = clone2(input);
  ownRecord(input, "workbook");
  if (JSON.stringify(input).length > RIXCEL_WORKBOOK_LIMITS.textLength)
    fail5("workbook text limit exceeded");
  if (input.format !== RIXCEL_WORKBOOK_FORMAT || input.version !== 1)
    fail5("unsupported workbook format/version");
  if (!Array.isArray(input.documents) || !input.documents.length || input.documents.length > RIXCEL_WORKBOOK_LIMITS.documents)
    fail5("documents must contain 1..32 records");
  const ids = new Set;
  const documents = input.documents.map((record2) => {
    ownRecord(record2, "document record");
    const document = parseRixCelDocument(record2.document);
    identifier(document.id, "document ID");
    if (ids.has(document.id))
      fail5(`duplicate document ID: ${document.id}`);
    ids.add(document.id);
    return { document, names: dictionary(record2.names, (v) => target(v, document.shape), "name"), exports: dictionary(record2.exports, (v) => target(v, document.shape), "export"), imports: dictionary(record2.imports, (v) => {
      ownRecord(v, "import");
      if (Object.keys(v).length === 1 && Object.hasOwn(v, "external"))
        return { external: identifier(v.external, "external source") };
      if (Object.keys(v).length !== 2 || !Object.hasOwn(v, "document") || !Object.hasOwn(v, "export"))
        fail5("import needs document/export or external");
      return { document: identifier(v.document, "import document"), export: identifier(v.export, "import export").toLowerCase() };
    }, "import") };
  });
  ownRecord(input.external ?? {}, "external sources");
  const external = Object.fromEntries(Object.entries(input.external ?? {}).map(([id, record2]) => {
    identifier(id, "external source");
    ownRecord(record2, "external snapshot");
    if (typeof record2.value !== "string")
      fail5("external snapshot value must be mathematical JSON text");
    decodeMathematicalJSON(record2.value);
    ownRecord(record2.metadata, "source metadata");
    identifier(record2.metadata.source, "source metadata.source");
    identifier(record2.metadata.version, "source metadata.version");
    return [id, { value: record2.value, metadata: clone2(record2.metadata) }];
  }));
  if (Object.keys(external).length > 32)
    fail5("external source limit exceeded");
  const result = { format: RIXCEL_WORKBOOK_FORMAT, version: 1, documents, external };
  for (const record2 of documents)
    for (const entry of Object.values(record2.imports)) {
      if (entry.external) {
        if (!Object.hasOwn(external, entry.external))
          fail5(`missing external source: ${entry.external}`);
      } else {
        const owner = documents.find((r) => r.document.id === entry.document);
        if (!owner || !Object.hasOwn(owner.exports, entry.export))
          fail5(`missing owned export: ${entry.document}.exports.${entry.export}`);
      }
    }
  return result;
}
function createRixCelWorkbookDocument(documents, external = {}) {
  return parseRixCelWorkbook({ format: RIXCEL_WORKBOOK_FORMAT, version: 1, documents, external });
}
function stringifyRixCelWorkbook(value) {
  return JSON.stringify(parseRixCelWorkbook(value), null, 2);
}
function namespace(get) {
  return Object.freeze({ type: "map", entries: new Map, _ext: new Map([["GET", { type: "method_builtin", name: "Get", impl: ([_self, ...args]) => get(...args) }]]) });
}
function remapIndex(index, oldDoc, newDoc) {
  const old = oldDoc.events.slice(0, oldDoc.cursor), next = newDoc.events.slice(0, newDoc.cursor);
  let common = 0;
  while (common < old.length && common < next.length && JSON.stringify(old[common]) === JSON.stringify(next[common]))
    common++;
  const result = [...index];
  for (const event of old.slice(common).reverse())
    if (event.type === "axis:insert") {
      const a = event.axis - 1;
      if (result[a] >= event.coordinate && result[a] < event.coordinate + event.count)
        fail5("owned slot was removed by structural undo; update its definition in the same transaction");
      if (result[a] >= event.coordinate + event.count)
        result[a] -= event.count;
    }
  for (const event of next.slice(common))
    if (event.type === "axis:insert" && result[event.axis - 1] >= event.coordinate)
      result[event.axis - 1] += event.count;
  return indexOf(result, newDoc.shape);
}
function createRixCelWorkbook(input, options = {}) {
  if (typeof options.compileFormula !== "function" || typeof options.runFormula !== "function")
    fail5("requires an explicit formula compiler and isolated evaluator");
  const limits = { ...RIXCEL_WORKBOOK_LIMITS };
  for (const [key2, value] of Object.entries(options.limits ?? {})) {
    if (!Object.hasOwn(limits, key2) || !Number.isSafeInteger(value) || value < 1 || value > limits[key2])
      fail5(`invalid limit: ${key2}`);
    limits[key2] = value;
  }
  let specification = null, current = null, epoch = 0, disposed = false, updating = false;
  const listeners = new Set, pending = new Map, schedules = new Set, views = new Map;
  const check = () => {
    if (disposed)
      fail5("workbook is disposed");
  };
  const notify = (event) => {
    for (const listener of [...listeners])
      try {
        listener(event);
      } catch (error) {
        try {
          options.onListenerError?.(error);
        } catch {}
      }
  };
  function build(spec, requested = []) {
    let reads = 0, evaluations = 0;
    const started = Date.now(), labels = new Map, definitions2 = new Map, records = new Map, slotNodes = new Map, externalNodes = new Map;
    let graph2;
    const checkpoint = () => {
      check();
      if (++reads > limits.reads || Date.now() - started > limits.maxTimeMs)
        fail5("epoch read/time budget exceeded");
    };
    const add = (label, evaluator, source = null) => {
      if (graph2.nodeCount >= limits.nodes)
        fail5("materialized node budget exceeded");
      const key2 = `n${graph2.nodeCount}`;
      labels.set(key2, label);
      graph2.addComputed(key2, { fn: "DEFER", args: [] }, { initialize: false, source, evaluator() {
        checkpoint();
        if (++evaluations > limits.evaluations)
          fail5("epoch evaluation budget exceeded");
        return evaluator();
      } });
      return key2;
    };
    graph2 = createReactiveGraph({ id: "workbook", evaluateFormula() {
      fail5("missing node evaluator");
    }, cycleLabel: "Workbook cycle", labelForNode: (key2) => labels.get(key2) });
    const read = (key2) => {
      checkpoint();
      return deepCopyValue(graph2.get(key2));
    };
    function definitionKey(id, kind, name) {
      const key2 = definitions2.get(`${id}\x00${kind}\x00${name}`);
      if (key2 === undefined)
        fail5(`missing ${id}.${kind}.${name}`);
      return key2;
    }
    function slotKey2(id, index) {
      const record2 = records.get(id);
      if (!record2)
        fail5(`unknown document: ${id}`);
      index = indexOf(index, record2.document.shape);
      const address = `${id}\x00${index.join(",")}`;
      if (slotNodes.has(address))
        return slotNodes.get(address).key;
      const slot = record2.slots.get(index.join(",")) ?? { ...record2.document.defaultSlot, index, id: rixCelSlotId(record2.document, index) };
      if (slot.source.length > limits.sourceLength)
        fail5("formula source limit exceeded");
      const formula = options.compileFormula(slot.source), key2 = add(`${id}.grid[${index.join(",")}]`, () => run(id, formula, index), slot.source);
      slotNodes.set(address, { key: key2, slot, id });
      return key2;
    }
    function run(id, formula, index = null) {
      const owner = records.get(id);
      const grid = { type: "formula_sheet", shape: owner.document.shape, rank: owner.document.shape.length, get: (coords) => read(slotKey2(id, coords)) };
      const bindings = { grid, book: namespace((document, name) => read(definitionKey(identifier(document, "document"), "exports", identifier(name, "export").toLowerCase()))), names: namespace((name) => read(definitionKey(id, "names", identifier(name, "name").toLowerCase()))), imports: namespace((name) => read(definitionKey(id, "imports", identifier(name, "import").toLowerCase()))) };
      if (index)
        Object.assign(bindings, { index: { type: "tuple", values: index.map((n) => new Integer(BigInt(n))) }, row: new Integer(BigInt(index[0])), ...index.length > 1 ? { col: new Integer(BigInt(index[1])) } : {}, near: { type: "formula_near", rank: index.length, index, get: (offsets) => {
          if (offsets.length !== index.length)
            fail5("near rank mismatch");
          return grid.get(offsets.map((n, a) => index[a] + exactIndex2(n)));
        } } });
      return options.runFormula(formula, bindings, { reactiveGraph: graph2 });
    }
    function resolve(id, entry, formula) {
      if (entry.index)
        return read(slotKey2(id, entry.index));
      if (entry.name)
        return read(definitionKey(id, "names", entry.name));
      return run(id, formula);
    }
    for (const record2 of spec.documents) {
      const replay = replayRixCelDocument(record2.document);
      records.set(record2.document.id, { ...record2, ...replay, slots: new Map(replay.slots.map((slot) => [slot.index.join(","), slot])) });
    }
    for (const [id, record2] of Object.entries(spec.external))
      externalNodes.set(id, add(`external.${id}`, () => decodeMathematicalJSON(record2.value)));
    for (const [id, record2] of records)
      for (const kind of ["names", "exports", "imports"])
        for (const [name, entry] of Object.entries(record2[kind])) {
          if (entry.source?.length > limits.sourceLength)
            fail5("definition source limit exceeded");
          const formula = entry.source ? options.compileFormula(entry.source) : null;
          const key2 = add(`${id}.${kind}.${name}`, () => kind === "imports" ? read(entry.external ? externalNodes.get(entry.external) : definitionKey(entry.document, "exports", entry.export)) : resolve(id, entry, formula), entry.source);
          definitions2.set(`${id}\x00${kind}\x00${name}`, key2);
        }
    for (const [id, record2] of records)
      for (const slot of record2.slots.values())
        slotKey2(id, slot.index);
    for (const { id, index } of requested)
      if (records.has(id))
        slotKey2(id, index);
    graph2.recalculate();
    return { graph: graph2, records, slotNodes, labels, definitions: definitions2, reads, evaluations, elapsedMs: Date.now() - started };
  }
  function replace(next, requested = null) {
    check();
    if (updating)
      fail5("nested workbook update");
    updating = true;
    try {
      const spec = parseRixCelWorkbook(next);
      if (spec.documents.length > limits.documents || JSON.stringify(spec).length > limits.textLength)
        fail5("document/text budget exceeded");
      const demand = requested ?? [...current?.slotNodes.values() ?? []].filter(({ id }) => spec.documents.some((r) => r.document.id === id)).map(({ id, slot }) => ({ id, index: slot.index })).filter(({ id, index }) => {
        const shape2 = spec.documents.find((r) => r.document.id === id).document.shape;
        return index.length === shape2.length && index.every((n, a) => n <= shape2[a]);
      });
      const candidate = options.withEpoch ? options.withEpoch(() => build(spec, demand), limits) : build(spec, demand);
      if (candidate?.then)
        fail5("workbook epochs cannot suspend");
      const previousEpoch = epoch;
      specification = spec;
      current = candidate;
      epoch++;
      const event = Object.freeze({ type: "workbook:commit", epoch, previousEpoch, documents: Object.freeze(spec.documents.map((r) => r.document.id)), work: Object.freeze({ reads: candidate.reads, evaluations: candidate.evaluations, nodes: candidate.graph.nodeCount, elapsedMs: candidate.elapsedMs }) });
      notify(event);
      return api;
    } finally {
      updating = false;
    }
  }
  function recordFor(id) {
    check();
    const record2 = current.records.get(id);
    if (!record2)
      fail5(`unknown document: ${id}`);
    return record2;
  }
  function ensure(id, index) {
    const record2 = recordFor(id);
    index = indexOf(index, record2.document.shape);
    const key2 = `${id}\x00${index.join(",")}`;
    if (!current.slotNodes.has(key2))
      replace(specification, [...[...current.slotNodes.values()].map(({ id: id2, slot }) => ({ id: id2, index: slot.index })), { id, index }]);
    return current.slotNodes.get(key2);
  }
  const api = {
    get epoch() {
      return epoch;
    },
    get disposed() {
      return disposed;
    },
    get work() {
      check();
      return Object.freeze({ nodes: current.graph.nodeCount, reads: current.reads, evaluations: current.evaluations, elapsedMs: current.elapsedMs });
    },
    export() {
      check();
      return clone2(specification);
    },
    replace,
    transaction(changes) {
      check();
      if (!Array.isArray(changes) || changes.length > limits.documents)
        fail5("invalid document transaction");
      const next = clone2(specification), seen = new Set;
      for (const change of changes) {
        const id = identifier(change.id, "document ID");
        if (seen.has(id))
          fail5(`duplicate transaction document: ${id}`);
        seen.add(id);
        const record2 = next.documents.find((r) => r.document.id === id);
        if (!record2)
          fail5(`unknown document: ${id}`);
        const document = change.document ? parseRixCelDocument(change.document) : record2.document;
        if (document.id !== id)
          fail5("cannot change document identity");
        const structural = JSON.stringify(record2.document.events.slice(0, record2.document.cursor).filter((e) => e.type === "axis:insert")) !== JSON.stringify(document.events.slice(0, document.cursor).filter((e) => e.type === "axis:insert")) || JSON.stringify(record2.document.shape) !== JSON.stringify(document.shape);
        for (const kind of ["names", "exports"])
          if (change[kind] === undefined && structural)
            record2[kind] = Object.fromEntries(Object.entries(record2[kind]).map(([name, entry]) => {
              if (entry.index)
                return [name, { index: remapIndex(entry.index, record2.document, document) }];
              if (entry.source && tokenize(entry.source).some((t) => t.type === "Identifier" && ["grid", "near"].includes(t.value)))
                fail5(`structural edit needs explicit ${id}.${kind}.${name} source update in the same transaction`);
              return [name, entry];
            }));
        record2.document = document;
        for (const key2 of ["names", "exports", "imports"])
          if (change[key2] !== undefined)
            record2[key2] = change[key2];
      }
      return replace(next);
    },
    edit(id, event) {
      const record2 = recordFor(id);
      return api.transaction([{ id, document: appendRixCelEvent(record2.document, event) }]);
    },
    get(id, name) {
      check();
      const key2 = current.definitions.get(`${id}\x00exports\x00${identifier(name, "export").toLowerCase()}`);
      if (key2 === undefined)
        fail5(`missing owned export: ${id}.${name}`);
      return deepCopyValue(current.graph.get(key2));
    },
    dependencies(id, name) {
      check();
      const key2 = current.definitions.get(`${id}\x00exports\x00${identifier(name, "export").toLowerCase()}`);
      if (key2 === undefined)
        fail5("unknown export");
      return [...current.graph.node(key2).dependencies].map((k) => current.labels.get(k));
    },
    sheet(id) {
      recordFor(id);
      if (views.has(id))
        return views.get(id);
      const view = { type: "formula_sheet", id, get shape() {
        return [...recordFor(id).document.shape];
      }, get rank() {
        return this.shape.length;
      }, get documentView() {
        return clone2(recordFor(id).view);
      }, get epoch() {
        check();
        return epoch;
      }, get materializedSlotCount() {
        check();
        return [...current.slotNodes.values()].filter((s) => s.id === id).length;
      }, get(index) {
        const { key: key2 } = ensure(id, index);
        return deepCopyValue(current.graph.get(key2));
      }, slot(index) {
        const { key: key2, slot } = ensure(id, index), node = current.graph.node(key2);
        return Object.freeze({ ...clone2(slot), index: [...index], value: deepCopyValue(node.value), lastGoodValue: deepCopyValue(node.value), state: "clean", dependencies: [...node.dependencies].map((k) => current.labels.get(k)), diagnostics: [], diagnosticKind: null, diagnosticSource: null });
      }, materializedSlots() {
        check();
        return [...current.slotNodes.values()].filter((s) => s.id === id).map((s) => view.slot(s.slot.index));
      }, subscribe(listener) {
        return api.subscribe((event) => listener({ ...event, type: "formula:commit", sheet: view, changed: view.materializedSlots().map((s) => s.index) }));
      }, toString() {
        return `[Workbook sheet ${id}]`;
      } };
      views.set(id, view);
      return view;
    },
    materialize(id, indices) {
      check();
      if (!Array.isArray(indices) || indices.length > limits.nodes)
        fail5("materialization budget exceeded");
      const shape2 = recordFor(id).document.shape;
      const missing = indices.map((index) => indexOf(index, shape2)).filter((index) => !current.slotNodes.has(`${id}\x00${index.join(",")}`));
      if (missing.length)
        replace(specification, [...[...current.slotNodes.values()].map(({ id: id2, slot }) => ({ id: id2, index: slot.index })), ...missing.map((index) => ({ id, index }))]);
      return api.sheet(id);
    },
    subscribe(listener) {
      check();
      if (typeof listener !== "function")
        fail5("listener must be callable");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async refresh(id) {
      check();
      if (updating)
        fail5("cannot refresh during an epoch");
      if (!Object.hasOwn(specification.external, id))
        fail5(`unknown external source: ${id}`);
      const provider = options.providers && Object.hasOwn(options.providers, id) ? options.providers[id] : null;
      if (typeof provider !== "function")
        fail5(`no explicit refresh provider for ${id}`);
      if (pending.has(id))
        fail5(`refresh already in progress: ${id}`);
      if (pending.size >= limits.refreshConcurrent)
        fail5("refresh concurrency budget exceeded");
      const revision = epoch, controller = new AbortController;
      pending.set(id, controller);
      let timer;
      try {
        const cancelled = new Promise((_, reject) => {
          controller.signal.addEventListener("abort", () => reject(controller.signal.reason ?? new Error("refresh cancelled")), { once: true });
          timer = setTimeout(() => controller.abort(new Error("external refresh time budget exceeded")), limits.refreshTimeMs);
        });
        const result = await Promise.race([Promise.resolve().then(() => provider({ signal: controller.signal, metadata: clone2(specification.external[id].metadata) })), cancelled]);
        check();
        if (revision !== epoch)
          fail5("stale external refresh; workbook changed while waiting");
        const next = clone2(specification);
        next.external[id] = { value: encodeMathematicalJSON(result.value), metadata: clone2(result.metadata) };
        replace(next);
        return api.getExternal(id);
      } finally {
        clearTimeout(timer);
        if (pending.get(id) === controller)
          pending.delete(id);
      }
    },
    getExternal(id) {
      check();
      const record2 = Object.hasOwn(specification.external, id) ? specification.external[id] : null;
      if (!record2)
        fail5("unknown external source");
      return { value: decodeMathematicalJSON(record2.value), metadata: clone2(record2.metadata) };
    },
    schedule(id, intervalMs) {
      check();
      if (options.hostPolicy?.allowScheduledRefresh !== true)
        fail5("scheduled refresh requires explicit host policy");
      if (!Number.isSafeInteger(intervalMs) || intervalMs > 2147483647 || intervalMs < Math.max(1000, options.hostPolicy.minimumIntervalMs ?? 1000))
        fail5("scheduled interval must meet host minimum and be at most 2147483647ms");
      if (!Object.hasOwn(specification.external, id) || (!options.providers || !Object.hasOwn(options.providers, id) || typeof options.providers[id] !== "function"))
        fail5("schedule needs an explicit source/provider");
      if (schedules.size >= 32)
        fail5("schedule limit exceeded");
      const clock = options.clock ?? globalThis;
      const timer = clock.setInterval(() => {
        if (!disposed && !pending.has(id))
          api.refresh(id).catch((error) => notify(Object.freeze({ type: "workbook:refresh-error", source: id, message: error.message, epoch })));
      }, intervalMs);
      const cancel = () => {
        clock.clearInterval(timer);
        schedules.delete(cancel);
      };
      schedules.add(cancel);
      return cancel;
    },
    dispose() {
      if (disposed)
        return;
      disposed = true;
      for (const cancel of [...schedules])
        cancel();
      for (const controller of pending.values())
        controller.abort(new Error("workbook disposed"));
      pending.clear();
      listeners.clear();
      views.clear();
      current = null;
      specification = null;
    }
  };
  replace(input, []);
  return api;
}

export { __toESM, __commonJS, __export, __require, sourceLimits, checkSourceLimit, checkAstLimits, posToLineCol, tokenize, scanNumberLiteral, BaseSystem, Rational, RationalInterval, RationalIntervalSet, asRationalIntervalSet, rangeNegate, rangeAbsoluteValue, rangeAdd, rangeSubtract, rangeMultiply, rangeReciprocal, rangeDivide, rangeIntegerPower, checkRangeOperationResult, Fraction, FractionInterval, Integer, Relation, possibleRelations, CertifiedApproximation, certifiedRadixPrefix, certifiedContinuedFractionPrefix, boundedDecimalApproximation, boundedContinuedFractionApproximation, TypePromotion, NumeralSystem, parseApproximation, parseNumber, OperationalFault, CleanupGraceFault, isOperationalFault, faultToRixValue, ASYNC_LIMITS, asyncLimits, asyncLimitFault, capabilityAsyncPolicy, normalizeAsyncFailure, appendAsyncFailures, HOLE, isHole, UNDECIDED, UndecidedDiagnostic, undecidedDiagnostic, isUndecided, decisionState, shapedScalarDomain, valueBelongsToScalarDomain, validateShapedScalarDomain, isShaped, shapedRank, shapedShape, shapedSize, createShaped, createShapedView, shapedIndexTuple, shapedOffsetForTuple, forEachShapedCell, shapedGetBySelectors, shapedAssignBySelectors, coerceShapeValue, isRationalScalar, isExactValue, isCayleyValue, isCayleyInfinity, addScalars, subtractScalars, negateScalar, multiplyScalars, divideScalars, complexParts, complexConjugate, complexNormSquared, exactSquareRoot, cayleyFromCartesian, cayleyCartesian, multiplyCayley, conjugateCayley, inverseCayley, divideCayley, negateCayley, addCayley, subtractCayley, powCayley, equalCayley, cayleyReal, cayleyImaginary, createDefaultComplexCollection, powScalar, equalScalars, formatExact, isExactPi, createDefaultExactCollection, exactGeneratorFromPolynomial, isLazySequence, createLazySequence, lazyKnownLength, requireConcreteLazyValue, materializeLazySequenceAsync, ensureLazyIndex, materializeLazySequence, mapLazySequence, filterLazySequence, Cell, shallowCopyValue, deepCopyValue, copyAllMeta, transferMetaForUpdate, refinementMap, refinementEntry, normalizeRefinementRequest, refinementEffectiveLimits, refinementSupports, checkRefinementResult, unsupportedRefinementResult, refinementOutcome, realConstantState, isExpressionScalar, constantEquality, constantProviderInfo, EXPRESSION_SCHEMA, expressionField, initializeSymbolScope, freshExpressionSymbol, expressionDefinition, expandExpression, hasScopedSymbols, hasExtendedConstants, expressionStructuralKey, isMathExpression, expressionRecord, expressionVariable, expressionConstant, promoteExpression, expressionOperation, expressionApplication, installExpressionVariants, expressionSyntaxFunctions, expressionCapabilities, REACTIVE_READ_ENV, isReactiveNode, createReactiveGraph, resolveLabeledCoordinate, coordinateTuple, FORMULA_SHEET_ASSIGNMENT_MODES, isFormulaSheet, createFormulaSheet, rixCelCellFormat, parseRixCelDocument, createRixCelDocument, appendRixCelEvent, setRixCelCursor, setRixCelDraft, clearRixCelDraft, replayRixCelDocument, exportRixCelDocument, stringifyRixCelDocument, importRixCelDocument, attachMathContextMethods, decodeRefinableReal, encodeRefinableReal, encodeMathematicalJSON, decodeMathematicalJSON, mathematicalJSONCapabilities, createRixCelWorkbookDocument, stringifyRixCelWorkbook, createRixCelWorkbook };

//# debugId=4FB4909A07ECC78864756E2164756E21
//# sourceMappingURL=chunk-n5a1tte6.js.map

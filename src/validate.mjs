/*
 * ARGUMENT VALIDATION
 *
 * Shared checks for public setters and methods. The wrong type throws a
 * TypeError; the right type with an unusable value (NaN, Infinity, an
 * unknown name) throws a RangeError. Every check runs before any state
 * changes, so a failed call leaves the instance as it was.
 */


export const RANDOM_METHODS = Object.freeze(new Set(["uniform", "normal", "gaussian"]));



/**
 * Check that a value is a finite number.
 * @param {*} value The value to check.
 * @param {string} name The name to use in the error message.
 * @returns {number} The value.
 * @throws {TypeError} If the value is not a number.
 * @throws {RangeError} If the value is NaN or infinite.
 */
export const finite = (value, name) => {
	if (typeof value!=="number") {
		throw new TypeError(`ProximityEffect: ${name} must be a number (received ${typeof value}).`);
	}
	if (!Number.isFinite(value)) {
		throw new RangeError(`ProximityEffect: ${name} must be a finite number (received ${value}).`);
	}
	return value;
};



/**
 * Check that a value is a boolean.
 * @param {*} value The value to check.
 * @param {string} name The name to use in the error message.
 * @returns {boolean} The value.
 * @throws {TypeError} If the value is not a boolean.
 */
export const boolean = (value, name) => {
	if (typeof value!=="boolean") {
		throw new TypeError(`ProximityEffect: ${name} must be true or false (received ${typeof value}).`);
	}
	return value;
};



/**
 * Check that a value names a random method.
 * @param {*} value The value to check.
 * @param {string} name The name to use in the error message.
 * @returns {string} The value.
 * @throws {RangeError} If the value is not "uniform", "normal" or "gaussian".
 */
export const randomMethod = (value, name) => {
	if (!RANDOM_METHODS.has(value)) {
		throw new RangeError(`ProximityEffect: '${String(value)}' is not a valid ${name}. Use "uniform" or "normal".`);
	}
	return value;
};



/**
 * Check that a value is a string.
 * @param {*} value The value to check.
 * @param {string} name The name to use in the error message.
 * @returns {string} The value.
 * @throws {TypeError} If the value is not a string.
 */
export const string = (value, name) => {
	if (typeof value!=="string") {
		throw new TypeError(`ProximityEffect: ${name} must be a string (received ${typeof value}).`);
	}
	return value;
};

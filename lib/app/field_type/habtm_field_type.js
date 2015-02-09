/**
 * The HasAndBelongsToManyFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var HABTMFieldType = Function.inherits('FieldType', function HasAndBelongsToManyFieldType(schema, name, options) {
	HasAndBelongsToManyFieldType.super.call(this, schema, name, options);

	// @todo: set index stuff
});

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {ObjectId}
 */
HABTMFieldType.setMethod(function cast(value) {

	var result,
	    temp,
	    i;

	value = Array.cast(value);
	result = [];

	for (i = 0; i < value.length; i++) {
		temp = alchemy.castObjectId(value[i]);

		if (temp) {
			result.push(temp);
		}
	}

	return result;
});

/**
 * Cast a condition for a query
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {ObjectId}
 */
HABTMFieldType.setMethod(function castCondition(value) {
	return this.cast(value);
});
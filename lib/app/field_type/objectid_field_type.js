/**
 * The ObjectIdFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var ObjectIdFieldType = FieldType.extend(function ObjectIdFieldType(name, options) {
	FieldType.call(this, name, options);
});

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Mixed}   value
 *
 * @return   {ObjectId}
 */
ObjectIdFieldType.setMethod(function cast(value) {
	return alchemy.castObjectId(value);
});

alchemy.classes.ObjectIdFieldType = ObjectIdFieldType;
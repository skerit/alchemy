/**
 * Schema fields are nested schema's
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var SchemaFieldType = Function.inherits('FieldType', function SchemaFieldType(schema, name, options) {
	SchemaFieldType.super.call(this, schema, name, options);

	if (options.schema == null || typeof options.schema != 'object') {
		return;
	}

	this.fieldSchema = options.schema;

	if (!this.fieldSchema.name) {
		this.fieldSchema.setName(name);
	}

	if (!this.fieldSchema.parent) {
		this.fieldSchema.setParent(schema);
	}

	if (!this.fieldSchema.modelName) {
		this.fieldSchema.setModel(schema.modelName);
	}
});

/**
 * Get the subschema of this field
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Schema}
 */
SchemaFieldType.setMethod(function getSubschema(record) {

	var schema = this.options.schema,
	    temp;

	if (typeof schema == 'string') {
		field = this.schema.getField(schema);

		temp = field.getValues();

		if (temp == null) {
			return null;
		}

		temp = temp[field.getRecordValue(record)];

		if (temp != null) {
			schema = temp.schema;

			if (schema == null && typeof temp == 'function') {
				temp = new temp();
				schema = temp.schema || temp.blueprint;

				if (schema != null) {
					schema.setModel(this.schema.modelName);
					schema.setName(this.name);
					schema.setParent(this.schema);
				}
			}
		} else {
			schema = null;
		}
	}

	return schema;
});

/**
 * Cast all the subschema values using their _toDatasource method
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}      value        Value of field, an object in this case
 * @param    {Object}      data         The data object containing `value`
 * @param    {Datasource}  datasource   The destination datasource
 *
 * @return   {Object}
 */
SchemaFieldType.setMethod(function _toDatasource(value, data, datasource) {

	var subSchema,
	    record;

	record = {};

	// Recreate a record
	record[this.schema.name] = data;

	subSchema = this.getSubschema(record);

	return datasource.toDatasource(subSchema, value);
});
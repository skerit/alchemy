var data_listeners = alchemy.shared('data_binding_listeners');

/**
 * The Session class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Conduit}   conduit   The initializing conduit
 */
var Session = Function.inherits('Alchemy.Base', function ClientSession(conduit) {

	// Register the creation date
	this.created = new Date();

	// Register when the last scene connected
	this.last_scene_connection = null;

	// Create a session id
	this.id = alchemy.discovery_id + '-' + Crypto.uid();

	// The last activity date
	this.last_activity_date = new Date();

	// The websocket connection count
	this.connection_count = 0;

	// Scene id's we can expect to make a connection
	this.expected = {};

	// Scene connections will be stored here
	this.connections = {};

	// The data ids we want updates on
	this.data_listener_ids = {};

	// Postponed requests
	this.postponed = new Classes.Develry.Cache();

	// Postponed requests are invalidated after 1 hour
	this.postponed.max_age = 60 * 60 * 1000;

	// Increment the alchemy session count
	alchemy.session_count++;

	if (alchemy.settings.session_menu) {
		this.createMenuItem(conduit);
	}
});

/**
 * Amount of requests that have been made
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Number}
 */
Session.enforceProperty(function request_count(amount) {

	if (!amount || typeof amount != 'number') {
		return 0;
	}

	this.last_activity_date = new Date();

	return amount;
});

/**
 * Amount of server-side controller actions that have been executed
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Number}
 */
Session.enforceProperty(function action_count(amount) {

	if (!amount || typeof amount != 'number') {
		return 0;
	}

	return amount;
});

/**
 * Idle time
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Number}
 */
Session.setProperty(function idle_time() {

	var result = Date.now() - this.last_activity_date;

	return result;
});

/**
 * Register a conduit
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {Conduit}   conduit   The conduit to postpone
 *
 * @return   {String}    The postponed id
 */
Session.setMethod(function createMenuItem(conduit) {

	if (!alchemy.Janeway || !alchemy.Janeway.session_menu) {
		return;
	}

	let browser = conduit.useragent.family;

	if (conduit.useragent.major) {
		browser += ' ' + conduit.useragent.major;
	}

	browser += ': ' + conduit.ip;

	this.menu_item = alchemy.Janeway.session_menu.addItem(browser);
});

/**
 * Postpone the result
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {Conduit}   conduit   The conduit to postpone
 *
 * @return   {String}    The postponed id
 */
Session.setMethod(function postpone(conduit) {

	var key = Crypto.uid();

	this.postponed.set(key, conduit);

	return key;
});

/**
 * Executed when the session is removed from the session store
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Boolean}   expired   True if removed because time ran out
 */
Session.setMethod(function removed(expired) {

	var listeners,
	    data_id;

	// Decrement the alchemy session count
	alchemy.session_count--;

	for (data_id in this.data_listener_ids) {
		listeners = this.data_listener_ids[data_id];

		if (listeners && listeners[this.id]) {
			delete listeners[this.id];
		}
	}

	if (this.menu_item) {
		this.menu_item.remove();
	}

	this.emit('removed', expired);
});

/**
 * Destroy this session
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Session.setMethod(function destroy() {
	alchemy.sessions.remove(this.id);
});

/**
 * Execute function when sockets are connected
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Session.setMethod(function whenConnected(callback) {

	if (this.connection_count) {
		Blast.setImmediate(callback);
	} else {
		this.once('connected', callback);
	}
});

/**
 * Expect the given scene_id to make a connection later on
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Session.setMethod(function expectScene(scene_id) {
	this.expected[scene_id] = {
		updates: [] // Cached updates
	};
});

/**
 * Register a websocket connection
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Session.setMethod(function registerConnection(conduit) {

	var that = this,
	    scene_id = conduit.scene_id,
	    expected,
	    entry,
	    i;

	this.connections[scene_id] = conduit;
	this.connection_count++;

	// Update the last_scene_connection time
	this.last_scene_connection = new Date();

	if (this.connection_count == 1) {
		this.emit('connected');
	}

	// See if there are any queued updates
	expected = this.expected[scene_id];

	if (expected && expected.updates.length) {
		for (i = 0; i < expected.updates.length; i++) {
			entry = expected.updates[i];
			conduit.submit('data-update', entry);
		}

		conduit.last_update = Date.now();
	}

	// Remove the connection when disconnected
	conduit.on('disconnect', function onDisconnect() {

		var data_id;

		that.connection_count--;

		if (!scene_id) {
			return;
		}

		// Delete the scene from active data listeners
		for (data_id in that.data_listener_ids) {
			if (that.data_listener_ids[data_id][scene_id]) {
				delete that.data_listener_ids[data_id][scene_id];
			}
		}

		// Delete the scene from the connections
		delete that.connections[scene_id];
	});
});

/**
 * Register data bindings
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}   live_bindings   Bindings from server or client render
 */
Session.setMethod(function registerBindings(live_bindings, scene_id) {

	var data_id,
	    config,
	    scene,
	    i;

	if (!Array.isArray(live_bindings)) {
		live_bindings = Object.keys(live_bindings);
	}

	// Go over every id we want updates on
	for (i = 0; i < live_bindings.length; i++) {
		data_id = live_bindings[i];

		if (!this.data_listener_ids[data_id]) {
			this.data_listener_ids[data_id] = {
				listening_scenes: {},
				last_data: null
			};
		}

		config = this.data_listener_ids[data_id];

		if (!scene_id) {
			// Update the last_register time
			config.last_preregister = Date.now();
		} else {
			scene = this.connections[scene_id];

			// @todo: data bindings before scene is connected are now ignored
			if (!scene) {
				config.last_preregister = Date.now();
				continue;
			}

			config.listening_scenes[scene_id] = scene;

			if (config.last_update > scene.last_update && config.last_data) {
				scene.last_update = Date.now();
				scene.submit('data-update', {id: data_id, data: config.last_data});
			}
		}

		// Also register in the global object
		if (!data_listeners[data_id]) {
			data_listeners[data_id] = {};
		}

		// Now the global object knows this session is listening to that data_id
		data_listeners[data_id][this.id] = this;
	}
});

/**
 * Give the user an update for this data
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String|ObjectId}   id
 * @param    {Object}            data
 * @param    {String}            scene_id   Optional scene_id
 */
Session.setMethod(function sendDataUpdate(id, data, scene_id) {

	var that = this,
	    config = this.data_listener_ids[id],
	    scene;

	if (!config) {
		return;
	}

	// Store the new data
	config.last_data = data;

	// Set the new data
	config.last_update = Date.now();

	// Only send it to a specific scene if wanted
	if (scene_id) {
		scene = this.connections[scene_id];

		if (scene) {
			// The scene has already connected, send the update immediately
			scene.last_update = Date.now();
			scene.submit('data-update', {id: id, data: data});
		} else {
			// The scene is not yet connected, add it to the updates
			scene = this.expected[scene_id];

			if (scene) {
				scene.updates.push({id: id, data: data});
			}
		}
	} else {

		// Go over every listening scene and submit the data
		Object.each(config.listening_scenes, function eachScene(scene, scene_id) {

			if (!scene) {
				return;
			}

			scene.last_update = Date.now();
			scene.submit('data-update', {id: id, data: data});
		});
	}
});

/**
 * Send updates to all connected clients listening to this id
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {String|ObjectId}   id
 * @param    {Object}            data
 */
Alchemy.setMethod(function updateData(id, _data) {

	var listeners = data_listeners[id],
	    data = _data,
	    temp,
	    key;

	if (Object.isEmpty(listeners)) {
		return;
	}

	if (data instanceof Classes.Alchemy.Document) {
		data = data[0];
	}

	// Look into the object for the correct data
	if (String(id).isObjectId() && String(data._id || data.id) != String(id)) {

		for (key in data) {
			temp = data[key];

			if (String(temp._id || temp.id) == String(id)) {
				data = temp;
				break;
			}
		}
	}

	Object.each(listeners, function eachListener(session, session_id) {
		session.sendDataUpdate(id, data);
	});
});
Add the following to your `package.json`:

```js
"consumedServices": {
  "debug": {
    "versions": {
      "1.0.0": "consumeDebug"
    }
  }
}
```

The consumeDebug then receives the following object:

```js
debugService = {
  /**
   * Adds a new debugger
   * @param {string} name  A unique name
   * @param {Debugger} dbg See below the definition for this below
   */
  addDebugger (name, dbg) { ... }
  /**
   * Removes a debugger
   * @param {string} name The unique name of the debugger
   */
  removeDebugger (name) { ... }
  /**
   * Adds a message to the output panel
   * @param {string} name    The unique name of the debugger the output message is for
   * @param {string} message The message
   */
  addOutputMessage (name, message) { ... }
  /**
   * Updates the existing configs for the specified debugger
   * @param  {string} name            The unique name of the debugger the configs are for
   * @param  {Array.<Config>} configs The configs this debugger can start
   */
  updateConfigs (name, configs) { ... }
}

/**
 * A config is used to start your debugger with different configurations.
 * E.g. you might have a config to debug your program and a config to debug certain tests
 * Note: this configs contain any number of properties but the "name" is the only one required
 * @typedef {object} Config
 * @property {string} name The unique name of the config
 */

/**
 * The "dbg" object passed to the "addDebugger" method
 * @typedef {object} Debugger
 */
dbg = {
  /**
  * @type {Array.<string>} A list of grammar scopes this debugger can debug
  */
  scopes: [ ... ],
  /**
   * @type {Array.<Config>} A list of configs
   */
  configs: [ { ... }, ... ]
  /**
   * @type {DebuggerAPI} The actual API that is called by this package in order to start and interact with this debugger
   */
  api: {
    ... // see below
  }
}
```

The following methods have to be available in your API and should always return a Promise
The documentation for each method and it's return values is below

```js
/**
 * @typedef {object} DebuggerAPI
 */
dbgAPI = {
    /**
     * Starts your debugger with the selected config and file
     * @param  {StartRequest}
     * @return {Promise}      No return value required
     */
    start({ config, file })

    /**
     * Stops the current debugging session
     * @return {Promise}       No return value required
     */
    stop()

    /**
     * Adds a new breakpoint for the passed in file and line
     * @param {AddBreakpointRequest}
     * @return {Promise}             {@link AddBreakpointResponse}
     */
    addBreakpoint({ file, line })

    /**
    * Removes the breakpoint
    * @param {RemoveBreakpointRequest}
    * @return {Promise}                No return value required
    */
    removeBreakpoint({ bp })

    /**
    * Resume the execution until the next breakpoint is hit (probably also know as "continue")
    * @return {Promise} {@link NewStateResponse}
    */
    resume()

    /**
    * Step to the next line of code
    * @return {Promise} {@link NewStateResponse}
    */
    next()

    /**
    * Step into the current function/instruction
    * @return {Promise} {@link NewStateResponse}
    */
    stepIn()

    /**
    * Step out of the current function/instruction
    * @return {Promise} {@link NewStateResponse}
    */
    stepOut()

    /** TODO
    * Restarts the debug session
    * @return {Promise} No return value required
    */
    restart()

    /**
     * Selects a stacktrace entry
     * @param {SelectStacktraceRequest}
     * @return {Promise}      No return value required
     */
    selectStacktrace({ index })

    /**
     * Selects a thread entry
     * @param {SelectThreadRequest}
     * @return {Promise}      No return value required
     */
    selectThread({ id })

    /**
     * Gets the current stacktrace for the given "threadID"
     * @param {GetStacktraceRequest}
     * @return {Promise}             {@link GetStacktraceResponse}
     */
    getStacktrace({ threadID })

    /**
    * Gets the current threads
    * @param {GetThreadsRequest}
    * @return {Promise}             {@link GetThreadsResponse}
    */
    getThreads()

    /**
    * Loads the children for a variable
    * @param {LoadVariableRequest}
    * @return {Promise}            {@link LoadVariableResponse}
    */
    loadVariable({ path, variable })
      --> { variables }
}

/**
 * The object passed to the "start" method
 * @typedef   {object} StartRequest
 * @property  {Config} config The selected config
 * @property  {string} file   The currently open file
 */

/**
 * The object passed to the "addBreakpoint" method
 * @typedef   {object} AddBreakpointRequest
 * @property  {string} file The file
 * @property  {number} line The zero-based line number
 */

/**
 * The object returned by the Promise of the "addBreakpoint" method
 * @typedef   {object} AddBreakpointResponse
 * @property  {any} id An unique id/name for the breakpoint
 */

/**
 * The object passed to the "removeBreakpoint" method
 * @typedef   {object} RemoveBreakpointRequest
 * @property  {string} file The file
 * @property  {number} line The zero-based line number
 * @property  {any}    id   The unique id/name for the breakpoint
 */

/**
 * The object returned by a Promise that previously has called "resume", "next", "stepIn", "stepOut"
 * @typedef   {object} NewStateResponse
 * @property  {any}     threadID The current thread id the debugger is waiting on
 * @property  {boolean} exited   Whether the execution has finished (true) or not (false)
 */

/**
 * The object passed to the "selectStacktrace" method
 * @typedef   {object} SelectStacktraceRequest
 * @property  {number} index The index of the selected stacktrace
 */

/**
 * The object passed to the "selectThread" method
 * @typedef   {object} SelectThreadRequest
 * @property  {any} id The unique thread id
 */

/**
 * The object passed to the "getStacktrace" method
 * @typedef   {object} GetStacktraceRequest
 * @property  {any} threadID The unique thread id
 */

/**
 * The object returned by the Promise of the "getStacktrace" method
 * @typedef   {Array.<StacktraceEntry>} GetStacktraceResponse
 */

/**
 * A single entry in a stacktrace array
 * @typedef   {object} StacktraceEntry
 * @property  {string} file      The file
 * @property  {string} line      The zero-based line number
 * @property  {string} func      The function name
 * @property  {Object.<string,Variable>} variables The variables for this entry. It is a flat map of paths to variables. An entry with key "myMap.myKey" represents roughly this JSON { myMap: { myKey: <value> } }
 */

/**
 * A variable
 * @typedef   {object} Variable
 * @property  {string} name The name of the variable
 * @property  {boolean} loaded Whether this children is loaded or not
 * @property  {boolean} hasChildren Whether this variable has children or not
 * @property  {any} value The actual value of this variable
 * @property  {string} parentPath The path of the parent variable it belongs to
 * @property  {Object.<string,Variable>} variables The variables for this entry
 */

/**
 * The object passed to the "getThreads" method
 * @typedef   {object} GetThreadsRequest
 * @property  {any} threadID The unique thread id
 */

/**
 * The object returned by the Promise of the "getThreads" method
 * @typedef   {Array.<Thread>} GetThreadsResponse
 */

/**
 * A thread
 * @typedef   {object} Thread
 * @property  {string} file The file
 * @property  {string} line The zero-based line number
 * @property  {string} func The function name
 * @property  {string} id   The unique id/name of this thread
 */

 /**
 * The object passed to the "loadVariable" method
 * @typedef   {object} LoadVariableRequest
 * @property  {string} path The path of the variable
 * @property  {Variable} variable The variable itself
 */

 /**
 * The object returned by the Promise of the "loadVariable" method
 * @typedef   {Object.<string,Variable>} LoadVariableResponse
 */

```

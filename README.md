# Index Factory
This project is designed to create MongoDb index commands based on slow queries logged by the Mongo-profiler.
On start, it connects to the Mongo server, sets the profiling level to 1 which logs slow queries ("slow" is configurable) and opens an express server. 
After a sufficient amount of queries have been run, sending a request to the server outputs the recommended indices back to the browser in a command format such as:
```db.collName.createIndex({col1:1,col2:-1})```

## Getting started
### 1. Download the sources
``` git clone https://github.com/tomleibo/IndexFactory.git ```

##### Using npm
Note that the code can be downloaded without the node_modules directory and `npm install` can be used, but a little fix in the MongoDB driver is required, in order to query the profiling info collection of the database the driver is currently connected to, and not the admin database's profiling collection. 
To do that open `node_modules/mongodb/lib/admin.js` and replace this line:

``` self.s.topology.cursor("admin.system.profile", { find: 'system.profile', query: {}}, {}).toArray(callback); ```

With this:

``` self.s.topology.cursor(self.s.db.databaseName+".system.profile", { find: 'system.profile', query: {}}, {}).toArray(callback); ```

### 2. Configure the project 
Open `config.json` and change the configuration keys according to your environment.
* `dbhost` - The host name of the DB.
* `dbport` - The port of the DB.
* `dbname` - The Database name.
* `authenticate` - Boolean denoting if the Mongo server requires authentication.
* `dbUser` - In case authenticate is true, this is the user name for authenticating. 
* `dbPass` - In case authenticate is true, this is the password for authenticating.
* `adminDbUser` - In case authenticate is true, this is the user name for the system databse.
* `adminDbPass` - In case authenticate is true, this is the password for the system databse.
* `slow` - Threshold in milliseconds for queries to be considered "slow" and logged by Mongo's profiler.
* `expressPort` - The port the Express server will listen to.
* `connectionOptions` - A JS object with MongoClient connection options, like `{ssl:true}`

### Optional step - Delete the current prolfiling info
The index creation is based on logged queries, therefore any previously logged queries will also be used to create indices.
This can be done by running these commands in the Mongo shell:
```
db.setProfilingLevel(0)
db.system.profile.drop()
```

### 3. Run `node server`
Now the Mongo profiler is set to log any query that is slower than what you configured in `slow` in `config.json` and the server is running at the port specified.

### 4. Send a request
Call the `/` route of the server.
The results will be shown in the browser.

## Dependencies
##### Express version 2.2.33
##### MongoDb's node driver version 2.2: `https://mongodb.github.io/node-mongodb-native/`

## Tests
The tests are still very basic and simple, no framework was used either.
The tests are found in the `/tests` directory and can be run with `npm test`.

## License
GPLv3

## Contribution
I would be glad for any help, as I don't have any free time to work on this project. Pull requests are welcome.



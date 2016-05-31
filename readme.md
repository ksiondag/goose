# Goose

Model creation API inspired from [Django](https://www.djangoproject.com/) and
[Mongoose](http://mongoosejs.com/).

## Why Goose?

Original idea was to separate [Mongoose](http://mongoosejs.com/)'s model
abstraction from [mongoDB](https://www.mongodb.com/). Hence the name "Goose". I
might want to have models that don't live in a mongo database. I might not want
to use mongoDB at all, or maybe even not use a database at all but still use
the model abstraction.

If I'm just prototyping an idea really fast, I don't need the baggage of
thinking about scaling and databases. I just want to connect things together.
Even needing to setup and interact with a [SQLite](https://www.sqlite.org/)
database can be distracting from the idea.

Then, when scaling comes into play, I'd like to measure the different database
options via proper profiling (not that I know how to do that). Meaning I'd like
to be able to plug my implementation into a database via wrappers and such.
Hopefully, the wrapping doesn't incur significant resourse-cost overall.

## Roadmap

### Model implementation, no database (Version 0.x.0)

1. Model-creation and interactivity with basic tests using core node library
1. Model dumping to and loading from file
1. Natural keys and model property requirements
   * no null
   * type-enforcement
   * etc.

### Modularity and Database Plugin Socket (Version 1.x.0)

1. Model logic removed from main goose area and modularized elsewhere
1. Plugin capability to replace in-memory model storage to any given database
   wrapper
   * goose-sqlite (separate library) proof-of-concept
   * goose-mongodb (separate library)
     * come full circle with mongoose
     * compare/contrast with mongoose

### Profiling Tool (Version 2.x.0)

??? (I have no idea how to do proper profiling stuff, let alone build it into
a library.)


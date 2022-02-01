const reader = require('properties-reader');
const prop = reader('./res/application.properties');

module.exports = {
    getProperty(property){
        return prop.get(property)
    }
}
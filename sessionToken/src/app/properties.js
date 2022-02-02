const reader = require('properties-reader');
const prop = reader('./config/application.properties');

module.exports = {
    getProperty(property){
        return prop.get(property)
    }
}
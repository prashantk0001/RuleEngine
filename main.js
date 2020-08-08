/**
* Basic Rule Engine for javascript application to make logic configurable.
* 
* @author  Prashant Kashyap
* @version 1.0
* @since   2020-08-07
* DO NOT MODIFY
*/

/*
    @done :  
    @done :  add functionality to compare input params with each other
    @done :  add rule register method
    @done :  make inputs immutable, immer only required as a dev dependency for ruleEngine, remove when dev complete
    @done :  listed operators for inital phase : "&&","||","!=","==",">" ,">=","<" ,"<="
    @done :  wrap produce inside a simple method, created immutate()
    @done :  input should be able to specify if multiple rules need to be executed for that input
    @done :  made execue method async.
    @todo :  for multiple rules, priority and mapping of which rules passed should be made
    @todo :  add method to run all registered rules under a namespace

    ----------------------------------------------------------------------------------------------

    @todo :  Create Readme and dependencies, add more commments
    @todo :  List use cases for projects
    @todo :  Add all operators as const export prop - prepared, yet to export
    @todo :  remove immer when dev is complete, remove extra dependencies as well by native code(immutate)
    @todo :  add schema validation for rules, check for yup.js / ajv        - added ajv, need to revalidate schema

    ----------------------------------------------------------------------------------------------

    @nottodo :  look how to process if objects are sent as params, can recursively loop to locate props but not in object keys eg: data[this], 
                    this does not need to be implemented since users can pass individual params

    remarks : the operators will run on primitive values
        
        
*/

//this is input
let processMe = {
    ruleNameSpace : "mynamespace",
    executeAllRulesForSpecifiedNameSpace : true,
    rulesToExecute : ["myrule"],
    inputs : {
        param1 : 2,
        param2 : 3
    }
};

/*--------------------------------------------------------------------------------------------------------------------------------*/

//rule definition
let rules = [
    {
        ruleName : "myrule",
        returnVal : true,
        formula : {
            operator : "&&",
            criteria : [
                {
                    operator : "||",
                    criteria : [
                        {
                            operator : "!=",
                            param : "param1",
                            value : 1
                        },
                        {
                            operator : "==",
                            param : "param1",
                            value : 2
                        }
                    ]
                },
                {
                    operator : "!=",
                    param : "param2",
                    value : 3
                }
            ]
        }
    },
    {
        ruleName : "myrule2",
        returnVal : true,
        formula : {
            operator : "&&",
            criteria : [
                {
                    operator : "||",
                    criteria : [
                        {
                            operator : "!=",
                            param : "param1",
                            value : 1
                        },
                        {
                            operator : "==",
                            param : "param1",
                            value : 2
                        }
                    ]
                },
                {
                    operator : "&&",
                    criteria : [
                        {
                            operator : "!=",
                            param : "param1",
                            value : null
                        },
                        {
                            operator : "!=",
                            param : "param2",
                            value : null
                        },
                        {
                            operator : "!=",
                            param : "param2",
                            compareWith : "param1"
                        }
                    ]
                }
            ]
        }
    }
];

/*--------------------------------------------------------------------------------------------------------------------------------*/

/*dependencies*/

let immer = require("immer");
let Ajv = require("ajv");

let { produce } = immer;

const immutate = (rule) => produce(rule, (draft) => {return draft});



const criteriaSchema = {
    "type": ["object", "array"],
    "properties" : {
        "value" : {
            "type": ["number", "integer", "string", "boolean", "null"]
        },
        "compareWith" : {
            "type": "string"
        },
        "param" : {
            "type": "string"
        },
        "operator" : {
            "type" : "string",
            "enum": ["&&","||","!=","==",">" ,">=","<" ,"<="]
        },
        "criteria" : {
            "type" : ["array","object"]
        },
    },
    "required" : ["operator"],
    "additionalProperties" : false
}

const ruleSchema = {
    "definitions": {
        "criteria": {
            "type": ["object", "array"],
            "properties" : {
                "value" : {
                    "type": ["number", "integer", "string", "boolean", "null"]
                },
                "compareWith" : {
                    "type": "string"
                },
                "param" : {
                    "type": "string"
                },
                "operator" : {
                    "type" : "string",
                    "enum": ["&&","||","!=","==",">" ,">=","<" ,"<="]
                },
                "criteria" : {
                    //"type" : ["array","object"],
                     "$ref": "#/definitions/criteria" ,

                },
            },
            "required" : ["operator"],
            "additionalProperties" : false
        }
    },
    "type": "object",
    "properties": {
        "ruleName": { 
            "type": "string" 
        },
        "formula": {
            "type": "object",
            "properties" : {
                "operator" : {
                    "type" : "string"
                },
                "value" : {
                    "type": ["number", "integer", "string", "boolean", "null"]
                },
                "compareWith" : {
                    "type": ["number", "integer", "string", "boolean", "null"]
                },
                "param" : {
                    "type": "string"
                },
                "criteria" : { "$ref": "#/definitions/criteria" },
            },
            "required" : ["operator"],
            "additionalProperties" : false
        },
        "returnVal": {
            "type": ["number", "integer", "string", "boolean", "array", "object" , "null"],
            "additionalProperties" : true
        }
    },
    "required" : ["ruleName", "formula"],
    "additionalProperties" : false
}


const ajv = new Ajv({ allErrors: true}); // options can be passed, e.g. {allErrors: true}

const ruleValidator = ajv.compile(ruleSchema);


//engine code, exports etc
const ruleRegistry = {};

//public
const registerRule = (namespace, rule) => {
    let immutableRule = immutate(rule);
    let valid = ruleValidator(immutableRule);
    if(valid){
        ruleRegistry[namespace] = ruleRegistry[namespace] ? ruleRegistry[namespace] : [];
        ruleRegistry[namespace].push(immutableRule);
    }
}

const fetchRuleFromRegistry = (registry, ruleNameSpace, ruleName) => {
    return registry[ruleNameSpace].filter((rule) => {
        if(rule.ruleName === ruleName){
            return rule;
        }
    })[0];
}

const reducerForAND = (accumulator, currentValue) => accumulator && currentValue;
const reducerForOR = (accumulator, currentValue) => accumulator || currentValue;


const operatorMap = immutate({
    "&&"    :   "and",
    "||"    :   "or",
    "!="    :   "not-equals",
    "=="    :   "equals",
    ">"     :   "greater-than",
    ">="    :   "greater-than-equal-to",
    "<"     :   "less-than",
    "<="    :   "less-than-equal-to"
});

//public
const validOperations = Object.keys(operatorMap);

const criteriaValidator = ajv.compile(criteriaSchema);

const processCriteria = (criteria, inputs) => {

    let isValid = criteriaValidator(criteria);
    criteria
    isValid

    let operator = operatorMap[criteria.operator];
    
    switch(operator) {
        case "and": {
            let resultArr = criteria.criteria.map((nextCriteria) => {
                return processCriteria(nextCriteria, inputs);
             });
             return resultArr.reduce(reducerForAND);
        }
        break;
        case "or": {
            let resultArr = criteria.criteria.map((nextCriteria) => {
                return processCriteria(nextCriteria, inputs);
             });
             return resultArr.reduce(reducerForOR);
        }
        break;
        case "not-equals": {
            if(criteria.compareWith){
                return inputs[criteria.param] !== inputs[criteria.compareWith];
            }
            return inputs[criteria.param] !== criteria.value;
        }
        break;
        case "equals": {
            if(criteria.compareWith){
                return inputs[criteria.param] === inputs[criteria.compareWith];
            }
            return inputs[criteria.param] === criteria.value;
        }
        break;
        case "greater-than": {
            if(criteria.compareWith){
                return inputs[criteria.param] > inputs[criteria.compareWith];
            }
            return inputs[criteria.param] > criteria.value;
        }
        break;
        case "greater-than-equal-to": {
            if(criteria.compareWith){
                return inputs[criteria.param] >= inputs[criteria.compareWith];
            }
            return inputs[criteria.param] >= criteria.value;
        }
        break;
        case "less-than": {
            if(criteria.compareWith){
                return inputs[criteria.param] < inputs[criteria.compareWith];
            }
            return inputs[criteria.param] < criteria.value;
        }
        break;
        case "less-than-equal-to": {
            if(criteria.compareWith){
                return inputs[criteria.param] <= inputs[criteria.compareWith];
            }
            return inputs[criteria.param] <= criteria.value;
        }
        break;
        default:{}
      }
}

const engine = (rule , processMe) => {
    if(rule && processMe){
        rule
        processMe
        let outcome = processCriteria(rule.formula, processMe.inputs);
        outcome 
        if(outcome && rule.returnVal){
            return rule.returnVal;
        }else{
            return outcome;
        }
    
    }
}

const executor = (processMe) => {
    if(processMe.rulesToExecute && processMe.rulesToExecute instanceof Array){
        let results = {
            processMe : processMe,
            outcome : {}
        }
        if(processMe.executeAllRulesForSpecifiedNameSpace){
            ruleRegistry[processMe.ruleNameSpace].forEach( (fetchedRule) => {
                let result =  engine(fetchedRule, processMe);
                results.outcome[fetchedRule.ruleName] = result;
            } );
        } else {
            processMe.rulesToExecute.forEach( (ruleName) => {
                let fetchedRule = fetchRuleFromRegistry(ruleRegistry, processMe.ruleNameSpace ,ruleName );
                let result =  engine(fetchedRule, processMe);
                results.outcome[ruleName] = result;
            });
        }
        return results;
    }

}

//public
const execute = (processMe) => {
    return new Promise((resolve) =>{
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            resolve(immutate(executor(processMe)));
        }, 0);
    });
}

module.exports = {
    execute,
    registerRule,
    validOperations
}

/* usage */
registerRule("mynamespace", rules[0]);
registerRule("mynamespace", rules[1]);

let immutableProcessMe = immutate(processMe);
var finalResult;

execute(immutableProcessMe).then((res)=>{
    finalResult = res;
    finalResult
});
/* usage */



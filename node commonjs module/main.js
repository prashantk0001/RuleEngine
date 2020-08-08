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
    @done :  make inputs & outputs immutable
    @done :  listed operators for inital phase : "&&","||","!=","==",">" ,">=","<" ,"<="
    @done :  wrap produce inside a simple method, created immutate()
    @done :  input should be able to specify if multiple rules need to be executed for that input
    @done :  made execue method async.
    @done :  for multiple rules, priority and mapping of which rules passed should be made
    @done :  add method to run all registered rules under a namespace
    @done :  Add all operators as const export prop - prepared
    @done :  add schema validation for rules, check for yup.js / ajv        - added ajv, need to revalidate schema
    @done :  validate processMe
    @done :  Add Rejection to promise, with validation errors

    ----------------------------------------------------------------------------------------------

    @todo :  Create Readme and dependencies, add more commments
    @todo :  List use cases for projects
    @todo :  add distribution package for browser

    ----------------------------------------------------------------------------------------------
    
    @nottodo :  look how to process if objects are sent as params, can recursively loop to locate props but not in object keys eg: data[this], 
        this does not need to be implemented since users can pass individual params
    
    
    @futurescope :  return value to be sent from input prarm when needed

    remarks : the operators will run on primitive values, i.e. params must be primitive
         
        
*/

/*--------------------------------------------------------------------------------------------------------------------------------*/

/*dependencies*/
/* immer js to add robustness */
let immer = require("immer");
/* ajv for schema validation */
let Ajv = require("ajv");

let { produce } = immer;

//makes the passed object immutable
const immutate = (obj) => produce(obj, (draft) => {return draft});

/*
    JSONSchema to validate user input
*/
const processMeSchema = {
    "type" : ["object"],
    "properties" :  {
        "ruleNameSpace" : {
            "type" : "string"
        },
        "executeAllRulesForSpecifiedNameSpace" : {
            "type" : "boolean"
        },
        "rulesToExecute" : {
            "type" : "array"
        },
        "inputs" : {
            "type" : "object",
            "additionalProperties" : true
        }
    },
    "required" : ["ruleNameSpace"],
    "additionalProperties" : false
}

/*
    JSONSchema to validate criteria
*/
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

/*
    JSONSchema to validate rules
*/
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

const ajv = new Ajv({ allErrors: true }); // init ajv

//pre compile all validators
const ruleValidator = ajv.compile(ruleSchema);
const inputValidator = ajv.compile(processMeSchema);
const criteriaValidator = ajv.compile(criteriaSchema);

/*
    fetches specified rule in the registry namespace
*/
const fetchRuleFromRegistry = (registry, ruleNameSpace, ruleName) => {
    return registry[ruleNameSpace].filter((rule) => {
        if(rule.ruleName === ruleName){
            return rule;
        }
    })[0];
}

//reducer method to process AND logical operator
const reducerForAND = (accumulator, currentValue) => accumulator && currentValue;
//reducer method to process OR logical operator
const reducerForOR = (accumulator, currentValue) => accumulator || currentValue;

/*
    to simplify operators for users
*/
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

/*
    recursive method that resolves all criteria and returns result.
     also validates the passed criteria, throws runtime error if criteria validation fails
*/
const processCriteria = (criteria, inputs) => {
    let isValid = criteriaValidator(criteria);

    if(isValid){
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
    }else{
        console.error("Runtime Error : 'Criteria is invalid'");
        console.error(criteriaValidator.errors);
        throw criteriaValidator.errors;
    }
}

/*
    processes a single rule that is passed against input
*/
const engine = (rule , processMe) => {
    if(rule && processMe){
        let outcome = processCriteria(rule.formula, processMe.inputs);
        if(outcome && rule.returnVal){
            return rule.returnVal;
        }else{
            return outcome;
        }
    
    }
}

//public property: for the devs to refer if they need to know which operators are allowed
const validOperations = immutate(Object.keys(operatorMap));

/*
    Module that initializes the RuleEngine
*/
function RuleEngine(){

    //private registry of rules
    const ruleRegistry = {};

    //public method that registers a rule in the specified namespace
    const registerRule = (namespace, rule) => {
        let immutableRule = immutate(rule);
        let isValid = ruleValidator(immutableRule);
        if(isValid){
            ruleRegistry[namespace] = ruleRegistry[namespace] ? ruleRegistry[namespace] : [];
            ruleRegistry[namespace].push(immutableRule);
        }else{
            console.error("Error : Cannot Register, 'Rule is invalid'");
            console.error(ruleValidator.errors);
            throw ruleValidator.errors;
        }
    }

    //method that processes input for all the specified rules in processMe Object
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

    //public method - validates processMe and initiates input processing
    const execute = (processMe) => {
        return new Promise((resolve, reject) =>{
            let immutableProcessMe = immutate(processMe);
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                try{
                    let isValid = inputValidator(processMe);
                    if(isValid){
                        resolve(immutate(executor(immutableProcessMe)));
                    }else{
                        console.error("Error: Cannot process, processMe is Invalid");
                        console.error(inputValidator.errors);
                        throw inputValidator.errors;
                    }
                    
                }catch(err){
                    reject(err);
                }
            }, 0);
        });
    }

    return {
        execute,
        registerRule,
    }

}

//exports
module.exports = {
    RuleEngine,
    validOperations
};


/**
* Basic Rule Engine for javascript application to make logic configurable.
* 
* @author  Prashant Kashyap
* @version 1.0
* @since   2020-08-07
* DO NOT MODIFY
*/

/*--------------------------------------------------------------------------------------------------------------------------------*/

/*add below dependencies using platform resource loader*/
/* immer js to add robustness */
/* ajv for schema validation */
import { loadScript } from 'lightning/platformResourceLoader';
import immerURL from '@salesforce/resourceUrl/immer';
import ajvURL from '@salesforce/resourceUrl/ajv';




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



/*
    fetches specified rule in the registry namespace
*/
const fetchRuleFromRegistry = (registry, ruleNameSpace, ruleName) => {
    // eslint-disable-next-line array-callback-return, consistent-return
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
    recursive method that resolves all criteria and returns result.
     also validates the passed criteria, throws runtime error if criteria validation fails
*/
// eslint-disable-next-line consistent-return
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
            // eslint-disable-next-line no-unreachable
            break;
            case "or": {
                let resultArr = criteria.criteria.map((nextCriteria) => {
                    return processCriteria(nextCriteria, inputs);
                });
                return resultArr.reduce(reducerForOR);
            }
            // eslint-disable-next-line no-unreachable
            break;
            case "not-equals": {
                if(criteria.compareWith){
                    return inputs[criteria.param] !== inputs[criteria.compareWith];
                }
                return inputs[criteria.param] !== criteria.value;
            }
            // eslint-disable-next-line no-unreachable
            break;
            case "equals": {
                if(criteria.compareWith){
                    return inputs[criteria.param] === inputs[criteria.compareWith];
                }
                return inputs[criteria.param] === criteria.value;
            }
            // eslint-disable-next-line no-unreachable
            break;
            case "greater-than": {
                if(criteria.compareWith){
                    return inputs[criteria.param] > inputs[criteria.compareWith];
                }
                return inputs[criteria.param] > criteria.value;
            }
            // eslint-disable-next-line no-unreachable
            break;
            case "greater-than-equal-to": {
                if(criteria.compareWith){
                    return inputs[criteria.param] >= inputs[criteria.compareWith];
                }
                return inputs[criteria.param] >= criteria.value;
            }
            // eslint-disable-next-line no-unreachable
            break;
            case "less-than": {
                if(criteria.compareWith){
                    return inputs[criteria.param] < inputs[criteria.compareWith];
                }
                return inputs[criteria.param] < criteria.value;
            }
            // eslint-disable-next-line no-unreachable
            break;
            case "less-than-equal-to": {
                if(criteria.compareWith){
                    return inputs[criteria.param] <= inputs[criteria.compareWith];
                }
                return inputs[criteria.param] <= criteria.value;
            }
            // eslint-disable-next-line no-unreachable
            break;
            // eslint-disable-next-line no-empty
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
// eslint-disable-next-line consistent-return
const engine = (rule , processMe) => {
    if(rule && processMe){
        let outcome = processCriteria(rule.formula, processMe.inputs);
        if(outcome && rule.returnVal){
            return rule.returnVal;
        // eslint-disable-next-line no-else-return
        }else{
            return outcome;
        }
    
    }
}

let produce;

//makes the passed object immutable
let immutate;
let ajv;

//pre compile all validators
let ruleValidator;
let inputValidator;
let criteriaValidator;
/*
    to simplify operators for users
*/
let operatorMap;

//public property: for the devs to refer if they need to know which operators are allowed
let validOperations;

const init = () =>{
    produce = window.immer.produce;
    immutate = (obj) => produce(obj, (draft) => {return draft})
    ajv = new window.Ajv({ allErrors: true }); // init ajv
    ruleValidator = ajv.compile(ruleSchema);
    inputValidator = ajv.compile(processMeSchema);
    criteriaValidator = ajv.compile(criteriaSchema);
    operatorMap = immutate({
        "&&"    :   "and",
        "||"    :   "or",
        "!="    :   "not-equals",
        "=="    :   "equals",
        ">"     :   "greater-than",
        ">="    :   "greater-than-equal-to",
        "<"     :   "less-than",
        "<="    :   "less-than-equal-to"
    });
    validOperations = immutate(Object.keys(operatorMap));
}

const loadDependencies = async (component) => {
    try {
        await loadScript(component, immerURL);
        await loadScript(component, ajvURL);
        init();
    } catch (err) {
        console.assert(err, err);
    }
}



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
    // eslint-disable-next-line consistent-return
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

export {
    RuleEngine,
    validOperations,
    loadDependencies
};
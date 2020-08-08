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

let processMe2 = {
    ruleNameSpace : "mynamespace2",
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
/*
const {
    RuleEngine,
    validOperations
} = require("./main.js");
*/
/* usage */

let engine1 = new RuleEngine();

engine1.registerRule("mynamespace", rules[0]);
engine1.registerRule("mynamespace", rules[1]);

var finalResult;

engine1.execute(processMe).then((res)=>{
    finalResult = res;
    console.log(finalResult);
});

let engine2 = new RuleEngine();

engine2.registerRule("mynamespace2", rules[0]);

var finalResult;

engine2.execute(processMe2).then((res)=>{
    finalResult = res;
    console.log(finalResult);
}, (err) => {
    console.log(err);
});
/* usage */



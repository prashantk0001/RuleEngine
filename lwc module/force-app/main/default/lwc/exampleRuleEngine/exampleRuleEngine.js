import { LightningElement, track } from 'lwc';
import { loadDependencies,RuleEngine } from 'c/ruleEngine';


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

//rules
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

export default class ExampleRuleBuilder extends LightningElement {

    @track rules;
    @track inputs;
    @track result1;
    @track result2;

    constructor(){
        super();
        this.rules = JSON.stringify(rules);
        this.inputs = JSON.stringify([processMe, processMe2]);
        
        loadDependencies(this);
    }

    process(){
        
        let engine1 = new RuleEngine();

        engine1.registerRule("mynamespace", rules[0]);
        engine1.registerRule("mynamespace", rules[1]);

        let finalResult;

        engine1.execute(processMe).then((res)=>{
            finalResult = res;
            console.log(finalResult);
            this.result1 = JSON.stringify(finalResult);
        });

        let engine2 = new RuleEngine();

        engine2.registerRule("mynamespace2", rules[0]);

        let finalResult2;

        engine2.execute(processMe2).then((res)=>{
            finalResult2 = res;
            console.log(finalResult2);
            this.result2 = JSON.stringify(finalResult2);
        }, (err) => {
            console.log(err);
        });
    }


}
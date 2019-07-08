// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityTypes, CardFactory, ActionTypes } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const WelcomeCard = require('./resources/WelcomeCard.json');
const HolidayList = require('./resources/HolidayList.json');
const HolidayCardTemplate = require('./resources/HolidayCard.json');
const LeaveCardTemplate = require('./resources/LeaveCard.json');
const {
    DialogSet,
    WaterfallDialog,
    TextPrompt,
    NumberPrompt,
    DialogTurnStatus
} = require('botbuilder-dialogs');

const Parameters = {
    reason:'reason',
    startDate:'startDate',
    endDate:'endDate',
    none:'none'
}


//Intents
const SHOW_HOLIDAYS_INTENT = "show_holidays";
const SHOW_FLEXI_HOLIDAYS_INTENT = "show_flexi_holidays";
const SUBMIT_INTENT = "submit";
const VIEW_LEAVES_INTENT = "view_leaves";
const VIEW_FLEXI_INTENT = "view_flexi";

//Date Entity Types
const DATERANGE = "undefined";
const BEFORE = "before";
const AFTER = "after";

//Properties
const FLEXIBLE_HOLIDAYS_COUNT_PROPERTY = "flexibleHolidaysCount";
const FLEXIBLE_HOLIDAYS_LIST_PROPERTY = "flexibleHolidaysList";
const LEAVE_COUNT_PROPERTY = "leaveCount";
const LEAVE_LIST_PROPERTY = "leaveList";

const CONVERSATION_FLOW_PROPERTY = 'conversationFlowProperty';

class LuisBot {
    /**
     *
     * @param {Object} conversationState
     * @param {Object} userState
     */
    constructor(application, luisPredictionOptions, conversationState, userState) {
        if (!conversationState) {
            throw new Error(
                'Missing parameter.  conversationState is required'
            );
        }
        if (!userState) {
            throw new Error('Missing parameter.  userState is required');
        }
        this.luisRecognizer = new LuisRecognizer(
            application,
            luisPredictionOptions,
            true
        );
        this.conversationFlow = conversationState.createProperty(
            CONVERSATION_FLOW_PROPERTY
        );
        //this.userProfile = userState.createProperty(USER_PROFILE_PROPERTY);
       
        this.flexibleHolidaysCount = userState.createProperty(FLEXIBLE_HOLIDAYS_COUNT_PROPERTY);
        this.flexibleHolidaysList = userState.createProperty(FLEXIBLE_HOLIDAYS_LIST_PROPERTY);
        this.leaveCount = userState.createProperty(LEAVE_COUNT_PROPERTY);
        this.leaveList = userState.createProperty(LEAVE_LIST_PROPERTY);
        this.userState = userState;
        this.userState.flexibleHolidaysCount = 0;
        this.userState.leaveCount = 0;
        this.userState.flexibleHolidaysList = [];
        this.userState.leaveList = [];
        console.log(userState);
    
    }
    

    HolidaysCount(d1, d2 )
    {
        var count = 0;
        var d = new Date(d1.toString());
        
        for(; d < d2; d.setDate(d.getDate()+1))
        {
            if(d.getDay()== 0 || d.getDay() == 6)
            {
                count++;
            }
        }
        return count

    }

    /**
     *
     * @param {Object} context on turn context object.
     */
    async onTurn(turnContext) {
        // By checking the incoming Activity type, the bot only calls LUIS in appropriate cases.
        if (turnContext.activity.type === ActivityTypes.Message) {
            // Perform a call to LUIS to retrieve results for the user's message.
            const results = await this.luisRecognizer.recognize(turnContext);
           
            var endDate = new Date(2019,12,31);
            var startDate  =new Date();
            var valueDate = new Date(0);
            
            if(results.luisResult.entities.length > 0)
            {
                var dateValue = results.luisResult.entities[0].resolution.values[1];
                console.log(dateValue);
                if(dateValue.hasOwnProperty("end"))
                {
                    endDate  =  new Date(dateValue.end);
                    console.log("endDate::::");
                    console.log(endDate);
        
                    
                }
                if(dateValue.hasOwnProperty("start"))
                {
                    startDate  =  new Date(dateValue.start);
                    console.log("startDate:::::::::");
                    console.log(startDate);
                    
                }
                if(dateValue.hasOwnProperty("value"))
                {
                    valueDate  =  new Date(dateValue.value);
                    console.log("valueDate:::::::::");
                    console.log(valueDate);
                    
                }
            }
            
            // Since the LuisRecognizer was configured to include the raw results, get the `topScoringIntent` as specified by LUIS.
            const topIntent = results.luisResult.topScoringIntent;

            if (topIntent.intent !== 'None') {
                switch(topIntent.intent)
                {
                    
                    
                    
                    //Show Public Holidays Intent
                    case SHOW_HOLIDAYS_INTENT: console.log("showing public holidays");
                    
                    var HolidayCard = JSON.parse(JSON.stringify(HolidayCardTemplate));
                    
                    
                    for(var j = 0; j < HolidayList.Holidays.length ; j++)
                    {
                       // console.log(j);
                        var holiday = HolidayList.Holidays[j];
                        var holidayDate  = new Date(holiday.Date);
                        if(holidayDate > startDate && holidayDate < endDate && holiday.Type == "Public")
                        {
                            
                            var dayObj = {"type": "TextBlock",
                                            "separator":true,
                                            "text": holiday.Day
                                            }
                            var dateObj = {"type": "TextBlock",
                            "separator":true,
                            "text": holiday.Date.toString()
                            }
                            var holidayObj = {"type": "TextBlock",
                            "separator":true,
                            "text": holiday.HolidayName
                            }
                            HolidayCard.body[0].columns[0].items.push(dayObj);
                            HolidayCard.body[0].columns[1].items.push(dateObj);
                            HolidayCard.body[0].columns[2].items.push(holidayObj);

                        }
                    }
                    var listOfPublicHolidays = {
                        text: 'Public Holidays',
                        attachments: [CardFactory.adaptiveCard(HolidayCard)]
                    }
                    await turnContext.sendActivity(
                        listOfPublicHolidays);
                    break;









                    case SHOW_FLEXI_HOLIDAYS_INTENT: console.log("showing flexible holidays");
                    var buttons = [];
                    for(var i = 0; i < HolidayList.Holidays.length; i++)
                    {
                        var holiday = HolidayList.Holidays[i];
                        var holidayDate  = new Date(holiday.Date);
                        if(holidayDate > startDate && holidayDate < endDate && holiday.Type == "Flexible")
                        {
                            var pushObject = {type:ActionTypes.PostBack,
                                            title:holiday.HolidayName + " on " + holiday.Date,
                                            value: holiday.Index};
                            buttons.push(pushObject);
                        }
                    }
                    // construct hero card.
                     const card = CardFactory.heroCard(
                        'Click on any of the below to avail a flexible holiday',
                        undefined,
                        buttons,
                        {
                            text:"You can avail a maximum of 3 flexible holidays"
                            
                        }
                     );

                    // add card to Activity.
                    const reply = { type: ActivityTypes.Message };
                    reply.attachments = [card];
                    reply.text = 'List of Upcoming Flexible Holidays';

                    // Send hero card to the user.
                    await turnContext.sendActivity(reply);
                    break;











                    case VIEW_FLEXI_INTENT:console.log("showing opted flexible holidays");
                    var HolidayCard = JSON.parse(JSON.stringify(HolidayCardTemplate));
                    for(var j = 0; j < this.userState.flexibleHolidaysList.length ; j++)
                    {
                       // console.log(j);
                        var holiday = HolidayList.Holidays[this.userState.flexibleHolidaysList[j]-1];
                        var holidayDate  = new Date(holiday.Date);
                        if(holidayDate > startDate && holidayDate < endDate)
                        {
                            
                            var dayObj = {"type": "TextBlock",
                                            "separator":true,
                                            "text": holiday.Day
                                            }
                            var dateObj = {"type": "TextBlock",
                            "separator":true,
                            "text": holiday.Date.toString()
                            }
                            var holidayObj = {"type": "TextBlock",
                            "separator":true,
                            "text": holiday.HolidayName
                            }
                            HolidayCard.body[0].columns[0].items.push(dayObj);
                            HolidayCard.body[0].columns[1].items.push(dateObj);
                            HolidayCard.body[0].columns[2].items.push(holidayObj);

                        }
                    }

                    var listOfFlexiHolidays = {
                        text: 'Your Flexible Holidays',
                        attachments: [CardFactory.adaptiveCard(HolidayCard)]
                    }
                    await turnContext.sendActivity(
                        listOfFlexiHolidays);

                    break;








                    case VIEW_LEAVES_INTENT: console.log("showing submitted requests");
                    var LeaveCard = JSON.parse(JSON.stringify(LeaveCardTemplate));

                    for(var i =0 ; i  < this.userState.leaveList.length; i++)
                    {
                        var leaveObj = this.userState.leaveList[i];
                        console.log("leave Object")
                        console.log(leaveObj.numberOfDays);
                        var startDateObj = {"type": "TextBlock",
                            "separator":true,
                            "text": leaveObj.startDate.toString()
                        }
                        
                        var endDateObj = {"type": "TextBlock",
                            "separator":true,
                            "text": leaveObj.endDate.toString()
                        }

                        var reasonObj = {"type": "TextBlock",
                        "separator":true,
                        "text": leaveObj.reason
                        }
                        var numberOfDaysObj = {"type": "TextBlock",
                        "separator":true,
                        "text": leaveObj.numberOfDays.toString()
                        }
                        LeaveCard.body[0].columns[0].items.push(startDateObj);
                        LeaveCard.body[0].columns[1].items.push(endDateObj);
                        LeaveCard.body[0].columns[2].items.push(reasonObj);
                        LeaveCard.body[0].columns[3].items.push(numberOfDaysObj);

                        var listOfUpcomingLeaves = {
                            text: 'UpcomingLeaves',
                            attachments: [CardFactory.adaptiveCard(LeaveCard)]
                        }
                        
                    
                        

                    }
                    await turnContext.sendActivity(
                        listOfUpcomingLeaves);
                    break;













                    case SUBMIT_INTENT: console.log("submitting a leave request");
                    console.log(startDate);
                    console.log("||")
                    console.log(endDate);
                    const flow = await this.conversationFlow.get(turnContext, {
                        lastQuestionAsked: Parameters.none
                    });
                    
                    if(valueDate > new Date(0))
                    {
                        console.log("inside date vale")
                        startDate = valueDate;
                        endDate = valueDate;
                    }
                    else if(results.luisResult.entities[0].resolution.values[1].hasOwnProperty("end"))
                    {

                    }
                    else
                    {
                        await turnContext.sendActivity(`Please provide the duration in comments!Thanks`);
                        break;
                    }
                    var timeDiff = Math.abs(endDate.getTime() - startDate.getTime());
                    var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); 
                    var weekendCount = this.HolidaysCount(startDate,endDate);
                    var remDays = diffDays - weekendCount;
                    for(var i = 0; i < HolidayList.Holidays.length; i++)
                    {
                        var holiday =  HolidayList.Holidays[i];
                        var dateOb  = new Date(holiday.Date);
                        if(dateOb >= startDate && dateOb <= endDate)
                        {
                            remDays = remDays -1;
                        }
                    }

                    if(this.userState.leaveCount + remDays > 27)
                    {
                        var rep = "You have availed ";
                        rep = rep + (this.userState.leaveCount).toString();
                        rep = rep + " leaves.\n You can apply for only";
                        rep = rep + (27-this.userState.leaveCount).toString() + " more leaves\n";
                        rep = rep + "Kindly check your input and try again";
                        await turnContext.sendActivity(rep);
                    }
                    else
                    {
                        console.log("start date:")
                        console.log(startDate);

                        console.log("end date:")
                        console.log(endDate);

                        this.userState.leaveCount = this.userState.leaveCount + remDays;
                        if(startDate == endDate)
                        {
                            remDays  = remDays + 1;
                        }
                        var leaveObject = {
                            startDate : startDate.toString(),
                            endDate: endDate.toString(),
                            numberOfDays:remDays,
                            reason: "adHoc"
                        }
                        if(remDays > 0)
                        {
                            this.userState.leaveList.push(leaveObject);
                            
                            console.log(this.userState.leaveCount);
                            await turnContext.sendActivity(`Successfully applied for leave`);
                        }
                        else
                        {
                            await turnContext.sendActivity(`The leave you have applied for either falls on a weekend or a holiday`);
                        }
                        
                    }

                    break;
                    default:break;
                    
                }
                await this.userState.saveChanges(turnContext);
            } else {
                // If the top scoring intent was "None" tell the user no valid intents were found and provide help.
                if(!isNaN(results.text))
                {
                    var index = parseInt(results.text);
                    if(this.userState.flexibleHolidaysCount == 3)
                    {
                        await turnContext.sendActivity(`You have already availed 3 flexible holidays`);
                    }
                    else
                    {
                        this.userState.flexibleHolidaysCount = this.userState.flexibleHolidaysCount+1;
                        this.userState.flexibleHolidaysList.push(results.text);
                        
                    }
                }
                else
                {
                    await turnContext.sendActivity(`Hey I can't do that yet.`);
                }

                console.log(this.userState.flexibleHolidaysList[0]);
                console.log(this.userState.flexibleHolidaysCount);
                await this.userState.saveChanges(turnContext);
               
            }
        } else if (
            turnContext.activity.type === ActivityTypes.ConversationUpdate &&
            turnContext.activity.recipient.id !==
                turnContext.activity.membersAdded[0].id
        ) {
            // If the Activity is a ConversationUpdate, send a greeting message to the user.
            const welcome = {
                text: 'Greetings',
                attachments: [CardFactory.adaptiveCard(WelcomeCard)]
            };
            await turnContext.sendActivity(
               welcome
            );
        } else if (
            turnContext.activity.type !== ActivityTypes.ConversationUpdate
        ) {
            // Respond to all other Activity types.
            await turnContext.sendActivity(
                `[${ turnContext.activity.type }]-type activity detected.`
            );
        }
    }
    
}

module.exports.MyBot = LuisBot;

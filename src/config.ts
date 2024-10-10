import { get, getClientIdFromToken } from "@elara-services/utils";

const boostRoleId = "1073408957080674376";

export const isMainBot =
    getClientIdFromToken(process.env.TOKEN as string) === "1192911723057917962"
        ? true
        : false;
export const mainBotId = "1073141234815750195"; // Guizhong's ID (DO NOT CHANGE)
export const mainServerId = "1073116154798809098"; // DO NOT CHANGE

export const economy = {
    channels: {
        main: [
            "1078889213015113788",
            "1083251462072709150",
            "1084311109793763348",
            "1102064258914721862",
            "1124788436545572884",
            "1119423311496097792",
            "1116994375415758868",
            "835328759577313302", // For testing, don't remove.
            "1279039089974186146",
        ],
        events: ["1078889213015113788", "1083251462072709150"],
        random: {
            trivia: "1083251462072709150",
            lemon: ["1078889213015113788", "1083251462072709150"],
            collectables: ["1078889213015113788", "1083251462072709150"],
        },
        quests: [
            "1078889213015113788",
            "1083251462072709150",
            "1084311109793763348",
            "1102064258914721862",
            "1124788436545572884",
            "1119423311496097792",
            "835328759577313302",
        ],
    },
    mora: {
        quests: {
            messages: 50,
            activity: 75,
        },
        min: 3,
        max: 8,
        special: {
            day: 5, // 5: Friday
            min: 5,
            max: 10,
        },
        dailyLimit: 150000,
        messagesInAMinute: 3,
        taxExempt: [
            boostRoleId, // Server Booster
            "1103906017340821624", // Council
            "1145946099270549535", // Carry
        ],
        events: {
            dilemma: 50,
            trivia: {
                mora: 25,
                rep: 0,
            },
        },
    },
    boost: {
        role: boostRoleId,
        amount: 1,
        claim: {
            amount: 250,
            time: get.days(7),
        },
    },
    fightBetLimit: 10000,
    commands: {
        rakeback: {
            time: get.hrs(1), // 1 hour
            percent: 0.0015, // x% amount taken from the betAmount for commands.
        },
        claim: {
            highRoller: 2000, // 2.5k per-week
        },
    },
    randomEvents: {
        chattersNeeded: 4,
        timeBetweenEvents: get.mins(10),
    },
};

export const channels = {
    general: "1078889213015113788",
    genshin: "1083251462072709150",
    achievementSubmit: isMainBot
        ? "1201375594189967410"
        : "1169502827392020510",
    starrail: "1102064258914721862",
    booster: "1088722755249262623",
    fines: "1191860591439126668",
    trades: "1140066659323883550", // Trading locked to this channel.
    botcommands: "1079322620295643217",
    wishing: "1172044618372763709", // Locked to wishing.
    store: "1080393927548489779",
    qotd: "1114375866659655760",
    gamblingcommands: [
        "1079322620295643217",
        "1165895572297895956", // bug testers
    ], // This has to be an array.
    testingbotcommands: ["1095738373462822943", "835328759577313302"], // Do not remove, or istg.
    transactions: {
        log: "1130568828724711484",
        pending: "1080393927548489779",
    },
    logs: {
        misc: "1190130282616061962",
        promises: "1177782308347052214",
        backups: "1190129903757168690",
        payments: "1190129859805073478",
        ratelimits: "1190048631030554644",
        main: "1111510236197552158",
        collectables: "1190129975639150632",
        strikes: "1279544692647923784",
    },
    heist: "1078889213015113788",
};

export const roles = {
    admin: "1073408549075570779",
    flashRole: "1188707025790701668",
    levels: [
        "1073123463725854720",
        "1073124202921594982",
        "1073124225902190673",
        "1073124245997113374",
        "1073124275680182335",
        "1076770132996665345",
        "1076770331278192701",
        "1091210684857057313",
        "1101657316073418862",
        "1131829878375862376",
    ],
    storekeeper: "1185422127235596288",
    mafia: "1132216942158155827",
    moderator: "1103906017340821624", // Set to @Council
    management: {
        econ: "1188120160402407544",
        corners: "1188119808353509436",
    },
    payroll: "1293222541116182528",
    highRoller: "1157951644978393098",
    devs: "1073443736807284806",
    staff: "1103906017340821624",
    graders: "1142915623400243350",
    qotd: "1114590871212523540",
    restrictedColors: ["1089061615133016074"],
    main: [
        "1090489182994038864",
        "835328759128260626",
        "1278979938128756748",
        "1280912574728372246",
    ], // Role IDs is for the testing servers, do not remove or replace it.
};
roles.main.push(roles.admin, roles.devs); // This inserts the 'admin' role ID for the main server.

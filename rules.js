import {
  ETwitterStreamEvent,
  TwitterApi
} from "twitter-api-v2";

const BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAAP%2FzGQEAAAAAmVjoA86E1ZzrpVV8nR9X1cuB95w%3Dhihl3FJKahNLVNJfu4Jhxn8km8qdbsAHV1giq8v4pcyChqA0Gm";

const appOnlyClient = new TwitterApi(BEARER_TOKEN);

const rules = await appOnlyClient.v2.streamRules();
console.log("____________________ RULES");
console.log(rules);

// Add rules -------------------------------------------------------------------
const addedRules = await appOnlyClient.v2.updateStreamRules({
  add: [
    // { value: "from:1353385906858827776", tag: "ML_Philosophy" },
    // { value: "from:1300511436872003585", tag: "WealthInc247" },
    // { value: "from:1258149995645210629", tag: "creation247" },
    // { value: "from:1498385524368850950", tag: "AncestralVril" },
    // { value: "from:1488583129585659906", tag: "PurityChad" },
    // { value: "from:1335222290250862592", tag: "imodernman" },
    // { value: "from:1291732240456650754", tag: "SaveYourSons" },
    // { value: "from:1390555468213411840", tag: "MascAffirmation" },
    // { value: "from:1480895518494674950", tag: "beselfmastered" },
    // { value: "from:1137727109546303488", tag: "MasculineTheory" },
    // { value: "from:1450248348041154565", tag: "egoofsigma" },
    // { value: "from:1445723856451244035", tag: "PowerOfValues" },
    // { value: "from:2878721162", tag: "thecolemination" },
    // { value: "from:1565398380729229313", tag: "Life__Mastery" },
    // { value: "from:1562402175619596288", tag: "Deep_philo" },
    // { value: "from:1442556974441267204", tag: "Psy_of_Money" },
    // { value: "from:1136301955016527874", tag: "barbaricvitalsm" },
    // { value: "from:1059871261092929537", tag: "AlpacaAurelius" },
    // { value: "from:333357345", tag: "cobratate" },
    // { value: "from:244647486", tag: "saylor" },
  ],
});

// Delete rules ----------------------------------------------------------------
// const deleteRules = await appOnlyClient.v2.updateStreamRules({
//   delete: {
//     ids: ['1619690413693992962'],
//   },
// });

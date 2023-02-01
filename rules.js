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
// const addedRules = await appOnlyClient.v2.updateStreamRules({
//   add: [
//     { value: "from:1488583129585659906 -is:quote -is:retweet", tag: "PurityChad" },
//     { value: "from:1059871261092929537 -is:quote -is:retweet", tag: "AlpacaAurelius" },
//     { value: "from:1300511436872003585 -is:quote -is:retweet", tag: "WealthInc247" },
//     { value: "from:1390555468213411840 -is:quote -is:retweet", tag: "MascAffirmation" },
//     { value: "from:1480895518494674950 -is:quote -is:retweet", tag: "beselfmastered" },
//     { value: "from:1136301955016527874 -is:quote -is:retweet", tag: "barbaricvitalsm" },
//     { value: "from:2878721162 -is:quote -is:retweet", tag: "thecolemination" },
//     { value: "from:1540302624800608257 -is:quote -is:retweet", tag: "overmind01" },
//     { value: "from:1565398380729229313 -is:quote -is:retweet", tag: "Life__Mastery" },
//     { value: "from:1353385906858827776 -is:quote -is:retweet", tag: "ML_Philosophy" },
//     { value: "from:1258149995645210629 -is:quote -is:retweet", tag: "creation247" },
//     { value: "from:1498385524368850950 -is:quote -is:retweet", tag: "AncestralVril" },
//     { value: "from:1335222290250862592 -is:quote -is:retweet", tag: "imodernman" },
//     { value: "from:1291732240456650754 -is:quote -is:retweet", tag: "SaveYourSons" },
//     { value: "from:1137727109546303488 -is:quote -is:retweet", tag: "MasculineTheory" },
//     { value: "from:1450248348041154565 -is:quote -is:retweet", tag: "egoofsigma" },
//     { value: "from:1445723856451244035 -is:quote -is:retweet", tag: "PowerOfValues" },
//     { value: "from:1562402175619596288 -is:quote -is:retweet", tag: "Deep_philo" },
//     { value: "from:1442556974441267204 -is:quote -is:retweet", tag: "Psy_of_Money" },
//     { value: "from:333357345 -is:quote -is:retweet", tag: "cobratate" },
//     { value: "from:1563466828453916674 -is:quote -is:retweet", tag: "TextDeep1" },
//     { value: "from:1308270326233604096 -is:quote -is:retweet", tag: "wealth_director" },
//     { value: "from:1339603410056724481 -is:quote -is:retweet", tag: "MindHaste" },
//     { value: "from:308800426 -is:quote -is:retweet", tag: "matt_gray_" },
//     { value: "from:965699949512900608 -is:quote -is:retweet", tag: "IAmClintMurphy" },
//     { value: "from:258512916 -is:quote -is:retweet", tag: "Codie_Sanchez" },
//     { value: "from:952050353813377024 -is:quote -is:retweet", tag: "MindTendencies2" },
//     { value: "from:862875254338846721 -is:quote -is:retweet", tag: "_Pammy_DS_" },
//     { value: "from:953757331933691905 -is:quote -is:retweet", tag: "IAmMyBestToday" },
//     { value: "from:216707460 -is:quote -is:retweet", tag: "TheAlexaPowell" },
//     { value: "from:72118738 -is:quote -is:retweet", tag: "MichellCClark" },
//     { value: "from:1510645219129184265 -is:quote -is:retweet", tag: "liftyourmind" },
//     { value: "from:954336280380346368 -is:quote -is:retweet", tag: "FitFounder" },
//     { value: "from:233472077 -is:quote -is:retweet", tag: "iambrillyant" },
//   ],
// });

// Delete rules ----------------------------------------------------------------
// const deleteRules = await appOnlyClient.v2.updateStreamRules({
//   delete: {
//     ids: [
//       '1620858517543321600',
//       '1620858517543321601',
//       '1620858517543321602',
//       '1620858517543321603',
//       '1620858517543321604',
//       '1620858517543321605',
//       '1620858517543321606',
//       '1620858517543321607',
//       '1620858517543321608',
//       '1620858517543321609',
//       '1620858517543321610',
//       '1620858517543321611',
//       '1620858517543321612',
//       '1620858517543321613',
//       '1620858517543321614',
//       '1620858517543321615',
//       '1620858517543321616',
//       '1620858517543321617',
//       '1620858517543321618',
//       '1620858517543321619',
//       '1620858517543321620',
//       '1620858517543321621',
//       '1620858517543321622',
//       '1620858517543321623',
//       '1620858517543321624',
//     ]
//   },
// });

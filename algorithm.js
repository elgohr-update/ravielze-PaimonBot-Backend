const { currentTime } = require("./data");

const borderFunction = (string) => {
    var bf = [0];
    var j = 0;
    var i = 1;
    while (i < string.length) {
        if (string[i] == string[j]) {
            j++;
            bf.push(j);
            i++;
        } else {
            if (j == 0) {
                bf.push(0);
                i++;
            } else {
                j = bf[j - 1];
            }
        }
    }
    return bf;
};

//Mengembalikan pola pattern muncul mulai idx berapa saja
const findOccurence = (pattern, text) => {
    pattern = pattern.toLowerCase();
    text = text.toLowerCase();
    var bf = borderFunction(pattern);
    var toReturn = [];
    var i = 0;
    var j = 0;
    while (i < text.length) {
        if (text[i] == pattern[j]) {
            i++;
            j++;
        } else if (j == pattern.length) {
            toReturn.push(i - j);
            j = bf[j - 1];
        } else if (j == 0) {
            i++;
        } else {
            j = bf[j - 1];
        }
    }
    if (j == pattern.length) {
        toReturn.push(i - j);
    }
    return toReturn;
};

const levenshteinDistance = (string1, string2) => {
    //Solusi DP bottom up, menyimpan dalam array
    string1 = string1.toLowerCase();
    string2 = string2.toLowerCase();
    var DP = [];
    for (var i = 0; i <= string1.length; i++) {
        DP.push([]);
        for (var j = 0; j <= string2.length; j++) {
            DP[i].push(i + j);
        }
    }
    for (var i = 1; i <= string1.length; i++) {
        for (var j = 1; j <= string2.length; j++) {
            DP[i][j] = Math.min(DP[i - 1][j], DP[i][j - 1]) + 1;
            if (string1[i - 1] == string2[j - 1]) {
                DP[i][j] = Math.min(DP[i][j], DP[i - 1][j - 1]);
            } else {
                DP[i][j] = Math.min(DP[i][j], DP[i - 1][j - 1] + 1);
            }
        }
    }
    return DP[string1.length][string2.length];
};

//Bernilai 0-1, semakin besar semakin mirip
const tingkatKemiripan = (str1, str2) => {
    var mx = Math.max(str1.length, str2.length);
    return 1 - levenshteinDistance(str1, str2) / mx;
};

const taskType = ["Kuis", "Ujian", "Tucil", "Tubes", "Praktikum"];
const keyword = ["deadline", "kapan", "dimajukan", "diundur", "kelar", "help"];

const convertString = (text) => {
    var types = [];
    for (var i = 0; i < 5; i++) {
        if (findOccurence(taskType[i], text).length > 0) {
            types.push(taskType[i]);
        }
    }
    /*
1. Nambah tugas
Keyword: -
Komponen: Type, Code, Note, Duedate
Type: Kuis, Ujian, Tucil, Tubes, Praktikum
*/
    if (types.length > 0) {
        if (/.*[A-Z]{2}\d{2}.*\d{2}-\d{2}-\d{4}/.test(text)) {
            var date = /\d{2}-\d{2}-\d{4}/.exec(text);
            var code = /[A-Z]{2}\d{4}/.exec(text);
            //Cari index untuk ambil note
            if (code && date) {
                var fromIdx = code.index + 7;
                var toIdx = date.index - 1;
                return {
                    type: 1,
                    body: {
                        type: types[0],
                        code: code[0],
                        deadline: date[0],
                        note: text.slice(fromIdx, toIdx),
                    },
                };
            }
        }
    }

    /*
2. Daftar deadline
Keyword: deadline
Komponen: (fromDate(opsional), endDate) / durasi
Durasi: x hari, x minggu
*/
    if (findOccurence("deadline", text).length > 0) {
        var date = text.match(/\d{2}-\d{2}-\d{4}/g);
        if (date) {
            if (date.length == 1) {
                return {
                    type: 2,
                    body: {
                        fromDate: currentTime(),
                        toDate: date[0],
                        type: types,
                    },
                };
            } else {
                return {
                    type: 2,
                    body: {
                        fromDate: date[0],
                        toDate: date[1],
                        type: types,
                    },
                };
            }
        } else {
            if (/hari ini/i.test(text)) {
                return {
                    type: 7,
                    body: {
                        fromDate: currentTime(),
                        duration: 0,
                        type: types,
                    },
                };
            }
            var days = /\d* hari/i.exec(text);
            var weeks = /\d* minggu/i.exec(text);
            if (days) {
                return {
                    type: 7,
                    body: {
                        fromDate: currentTime(),
                        duration: parseInt(days[0].split(" ")[0]),
                        type: types,
                    },
                };
            }
            if (weeks) {
                return {
                    type: 7,
                    body: {
                        fromDate: currentTime(),
                        duration: 7 * parseInt(weeks[0].split(" ")[0]),
                        type: types,
                    },
                };
            }
        }
    }

    /*
3. Tampil deadline
Keyword: kapan, type
Komponen: Code
*/
    if (findOccurence("kapan", text).length > 0) {
        var code = text.match(/[A-Z]{2}\d{4}/g);
        if (code) {
            if (types.length == 0) {
                return {
                    type: 3,
                    body: {
                        code: code[0],
                        type: ["Tubes", "Tucil"],
                    },
                };
            }
            return {
                type: 3,
                body: {
                    code: code[0],
                    type: types,
                },
            };
        }
    }

    /*
4. Update task
Keyword: dimajukan, diundur, task
Komponen: Date, ID Task
*/
    if (
        findOccurence("dimajukan", text).length > 0 ||
        findOccurence("diundur", text).length > 0
    ) {
        var task = text.match(/task \d*/g);
        var date = text.match(/\d{2}-\d{2}-\d{4}/g);
        if (task && date) {
            return {
                type: 4,
                body: {
                    taskId: parseInt(task[0].split(" ")[1]),
                    deadline: date[0],
                },
            };
        }
    }

    /*
5. Selesai ngerjain
Keyword: kelar ngerjain, task
Komponen: ID Task
*/
    if (findOccurence("kelar", text).length > 0) {
        var taskID = /task \d*/i.exec(text);
        if (taskID) {
            return {
                type: 5,
                body: {
                    taskId: parseInt(taskID[0].split(" ")[1]),
                },
            };
        }
    }

    /*
6. Daftar Fitur
Keyword: Help
*/
    if (findOccurence("Help", text).length > 0) {
        return { type: 6 };
    }

    //At this point tidak ada metode yg cocok, akan dicoba cek typo
    var wordText = text.split(" ");
    var typo = [];
    var fromIdx = 0;
    var tk = 0.0;
    for (var i = 0; i < wordText.length; i++) {
        for (var j = 0; j < keyword.length; j++) {
            tk = tingkatKemiripan(wordText[i], keyword[j]);
            if (tk > 0.75 && tk < 1) {
                typo.push([1 - tk, fromIdx, fromIdx + wordText[i].length, j]);
            }
        }
        fromIdx += wordText[i].length + 1;
    }
    typo.sort();

    var suggestion = [];
    for (var i = 0; i < typo.length && i < 3; i++) {
        suggestion.push({
            //Siapa tau butuh index buat font italic
            from: typo[i][1],
            to: typo[i][2],
            text:
                text.slice(0, typo[i][1]) +
                keyword[typo[i][3]] +
                text.slice(typo[i][2], text.length),
            tingkatKemiripan: 1 - typo[i][0],
        });
    }

    if (suggestion.length > 0) {
        return {
            type: -1,
            body: {
                suggestions: suggestion,
            },
        };
    }

    return { type: 0 };
};

// console.log(
//     convertString("Pakbos, ada tubes IF2240 HAloheloBandung 22-04-2021")
// );
// console.log(convertString("Hari ini deadline apaaja bos?"));
// console.log(convertString("Coy IF2211 deadlinenya kapan aja seh?"));
// console.log(
//     convertString(
//         "Video OS yaitu task 5 dimajukan jadi 01-05-2021 coba anjing minta ditabok"
//     )
// );
// console.log(convertString("Gw udh kelar ngerjain task 60 neh"));
// console.log(convertString("anjir bang heLp"));
// console.log(
//     convertString(
//         "Bang bot dimajokan eaaa pengen ngetes keler lu bisa autocorrect ga halp"
//     ).body.suggestions
// );

/**
 * IDTASK (INT) | Code VARCHAR(6) | type VARCHAR(16) | Note VARCHAR(1024) | deadline (DATE) | Done (BOOL)
 */

//

module.exports = { convertString };

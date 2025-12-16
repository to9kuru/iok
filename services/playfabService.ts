import { PLAYFAB_TITLE_ID, LEADERBOARD_STATISTIC_NAME } from '../constants';
import { LeaderboardEntry } from '../types';

let isLoggedIn = false;
let currentPlayerId: string | null = null;
let currentDisplayName: string | null = null;

const initPlayFab = () => {
    if (window.PlayFab) {
        window.PlayFab.settings.titleId = PLAYFAB_TITLE_ID;
    }
};

const login = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!window.PlayFabClientSDK) {
            reject("PlayFab SDK ロードエラー (AdBlockを確認してください)");
            return;
        }

        if (isLoggedIn && currentPlayerId) {
            resolve(currentPlayerId);
            return;
        }

        // Use a generated ID stored in local storage for a persistent "device" account
        let customId = localStorage.getItem('WDF_CustomID');
        if (!customId) {
            customId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(7);
            localStorage.setItem('WDF_CustomID', customId);
        }

        const loginRequest = {
            TitleId: PLAYFAB_TITLE_ID,
            CustomId: customId,
            CreateAccount: true
        };

        window.PlayFabClientSDK.LoginWithCustomID(loginRequest, (result: any, error: any) => {
            if (result && result.data) {
                isLoggedIn = true;
                currentPlayerId = result.data.PlayFabId;
                resolve(result.data.PlayFabId);
                // Try to get display name
                getDisplayName();
            } else {
                console.error("PlayFab Login Error:", error);
                
                let msg = error?.errorMessage || "ログインに失敗しました";
                
                // Specific handling for PlayerCreationDisabled
                if (error?.error === "PlayerCreationDisabled") {
                    msg = "【設定エラー】\nPlayFab管理画面 > 設定 > タイトルの設定 > [API 機能] タブ\n「Client/LoginWithCustomId を使用してプレイヤーの作成を無効にする」のチェックを【外して】保存してください。";
                }
                
                reject(msg);
            }
        });
    });
};

const getDisplayName = (): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!window.PlayFabClientSDK || !isLoggedIn) {
            resolve(null);
            return;
        }
        
        window.PlayFabClientSDK.GetPlayerProfile({
            PlayFabId: currentPlayerId,
            ProfileConstraints: { ShowDisplayName: true }
        }, (result: any, error: any) => {
            if (result?.data?.PlayerProfile?.DisplayName) {
                currentDisplayName = result.data.PlayerProfile.DisplayName;
                resolve(currentDisplayName);
            } else {
                resolve(null);
            }
        });
    });
};

const updateDisplayName = (name: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!window.PlayFabClientSDK || !isLoggedIn) {
            reject("ログインしていません");
            return;
        }

        window.PlayFabClientSDK.UpdateUserTitleDisplayName({
            DisplayName: name
        }, (result: any, error: any) => {
            if (result) {
                currentDisplayName = name;
                resolve();
            } else {
                reject(error?.errorMessage || "名前の更新に失敗しました");
            }
        });
    });
};

const submitScore = (timeInSeconds: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!window.PlayFabClientSDK || !isLoggedIn) {
            console.warn("Cannot submit score: PlayFab not logged in.");
            reject("ログインしていません"); 
            return;
        }

        // PlayFab uses integers. We'll store milliseconds or seconds * 100
        const score = Math.floor(timeInSeconds * 100);

        window.PlayFabClientSDK.UpdatePlayerStatistics({
            Statistics: [{
                StatisticName: LEADERBOARD_STATISTIC_NAME,
                Value: score
            }]
        }, (result: any, error: any) => {
            if (result) {
                resolve();
            } else {
                console.error("Submit Score Error:", error);
                
                let msg = error?.errorMessage || "スコア送信に失敗しました";
                
                // Handle permission error for stats
                if (error?.error === "NotAuthorized" || error?.errorCode === 1074 || error?.errorMessage?.indexOf("not authorized") !== -1) {
                    msg = "【設定エラー】\nPlayFab管理画面 > 設定 > タイトルの設定 > [API 機能] タブ\n「クライアントにプレイヤー統計情報のポストを許可する」に【チェックを入れて】保存してください。";
                }

                reject(msg);
            }
        });
    });
};

const getLeaderboard = (): Promise<LeaderboardEntry[]> => {
    return new Promise((resolve, reject) => {
        if (!window.PlayFabClientSDK || !isLoggedIn) {
             // Attempt login if needed, or fail
             login().then(() => {
                 // Retry once
                 fetchLeaderboardInternal(resolve, reject);
             }).catch(reject);
             return;
        }
        fetchLeaderboardInternal(resolve, reject);
    });
};

const fetchLeaderboardInternal = (resolve: Function, reject: Function) => {
    window.PlayFabClientSDK.GetLeaderboard({
        StatisticName: LEADERBOARD_STATISTIC_NAME,
        StartPosition: 0,
        MaxResultsCount: 10,
        ProfileConstraints: { ShowDisplayName: true }
    }, (result: any, error: any) => {
        if (result && result.data) {
            resolve(result.data.Leaderboard);
        } else {
            console.error("Get Leaderboard Error:", error);
            reject(error?.errorMessage || "ランキングの取得に失敗しました");
        }
    });
};

export const playFabService = {
    init: initPlayFab,
    login,
    updateDisplayName,
    getDisplayName: () => currentDisplayName,
    submitScore,
    getLeaderboard,
    isLoggedIn: () => isLoggedIn
};

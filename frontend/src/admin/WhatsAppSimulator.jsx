import React, {
    useState,
    useCallback,
    useEffect,
    useRef,
    useMemo,
} from "react";

import axios from "axios";

import {
    ArrowLeft,
    MoreVertical,
    Paperclip,
    Smile,
    Send,
    RotateCcw,
    Bot,
    User,
    QrCode,
    ScanLine,
    Copy,
    Check,
} from "lucide-react";

import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";

const API =
    import.meta.env.VITE_API_URL ||
    "http://localhost:8000/api";

/*
|--------------------------------------------------------------------------
| IMPORTANT
|--------------------------------------------------------------------------
| No hardcoded QR keyword.
|
| QR message always comes from selected journey/workflow trigger.
|--------------------------------------------------------------------------
*/

const SIMULATOR_STORAGE_PREFIX =
    "whatsapp_simulator_";

/*
|--------------------------------------------------------------------------
| LOCAL STORAGE KEYS
|--------------------------------------------------------------------------
*/

const MOBILE_STORAGE_KEY =
    `${SIMULATOR_STORAGE_PREFIX}mobile`;

const JOURNEY_STORAGE_KEY =
    `${SIMULATOR_STORAGE_PREFIX}journey`;

const MESSAGES_STORAGE_KEY =
    `${SIMULATOR_STORAGE_PREFIX}messages`;

const INPUT_STORAGE_KEY =
    `${SIMULATOR_STORAGE_PREFIX}input`;

const SESSION_STORAGE_KEY =
    `${SIMULATOR_STORAGE_PREFIX}session`;

const QR_MESSAGE_STORAGE_KEY =
    `${SIMULATOR_STORAGE_PREFIX}qr_message`;

/*
|--------------------------------------------------------------------------
| NORMALIZE TRIGGER
|--------------------------------------------------------------------------
|
| Supports:
|
| trigger_text: "hello"
| trigger: "hello"
| keyword: "hello"
| keywords: ["hello", "hi"]
| triggers: ["hello", "hi"]
| trigger: { text: "hello" }
|--------------------------------------------------------------------------
*/

function normalizeJourneyTrigger(journey) {
    if (!journey) {
        return "";
    }

    const possibleValues = [
        journey.trigger_text,
        journey.trigger,
        journey.keyword,
        journey.keywords,
        journey.triggers,
        journey.start_keyword,
        journey.startKeyword,
    ];

    for (const value of possibleValues) {
        /*
        |--------------------------------------------------------------------------
        | STRING
        |--------------------------------------------------------------------------
        */

        if (typeof value === "string") {
            const clean = value.trim();

            if (clean) {
                /*
                | If backend sends comma-separated keywords,
                | first keyword is used for QR.
                */

                const firstKeyword = clean
                    .split(/[,|]+/)
                    .map((item) => item.trim())
                    .find(Boolean);

                if (firstKeyword) {
                    return firstKeyword;
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | ARRAY
        |--------------------------------------------------------------------------
        */

        if (Array.isArray(value)) {
            for (const item of value) {
                if (typeof item === "string") {
                    const clean = item.trim();

                    if (clean) {
                        return clean;
                    }
                }

                if (
                    item &&
                    typeof item === "object"
                ) {
                    const nested =
                        item.text ??
                        item.value ??
                        item.keyword ??
                        item.trigger ??
                        item.name ??
                        "";

                    if (
                        typeof nested ===
                            "string" &&
                        nested.trim()
                    ) {
                        return nested.trim();
                    }
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | OBJECT
        |--------------------------------------------------------------------------
        */

        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            const nested =
                value.text ??
                value.value ??
                value.keyword ??
                value.trigger ??
                value.name ??
                "";

            if (
                typeof nested ===
                    "string" &&
                nested.trim()
            ) {
                return nested.trim();
            }
        }
    }

    return "";
}

export default function WhatsAppSimulator() {
    const navigate = useNavigate();

    /* =========================================================
       MOBILE
    ========================================================== */

    const [mobile, setMobile] = useState(() => {
        try {
            return (
                localStorage.getItem(
                    MOBILE_STORAGE_KEY
                ) || "0000000000"
            );
        } catch (error) {
            console.error(
                "LOAD MOBILE ERROR:",
                error
            );

            return "919876543210";
        }
    });

    /* =========================================================
       JOURNEYS
    ========================================================== */

    const [journeys, setJourneys] =
        useState([]);

    const [selectedJourney, setSelectedJourney] =
        useState(() => {
            try {
                return (
                    localStorage.getItem(
                        JOURNEY_STORAGE_KEY
                    ) || ""
                );
            } catch (error) {
                console.error(
                    "LOAD JOURNEY ERROR:",
                    error
                );

                return "";
            }
        });

    const [journeysLoading, setJourneysLoading] =
        useState(false);

    /* =========================================================
       LOAD PUBLISHED JOURNEYS
    ========================================================== */

  useEffect(() => {
    const loadJourneys = async () => {
        try {
            setJourneysLoading(true);

            const token =
                localStorage.getItem("token") ||
                localStorage.getItem("auth_token") ||
                localStorage.getItem("access_token");

            if (!token) {
                console.error("AUTH TOKEN NOT FOUND");
                setJourneys([]);
                setSelectedJourney("");
                return;
            }

            const response = await axios.get(
                `${API}/webhooks/whatsapp/journeys`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            console.log("JOURNEYS RESPONSE:", response.data);

            const list = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.data)
                ? response.data.data
                : [];

            setJourneys(list);

            setSelectedJourney((current) => {
                if (
                    current &&
                    list.some(
                        (journey) =>
                            String(journey.id) === String(current)
                    )
                ) {
                    return String(current);
                }

                let savedJourney = "";

                try {
                    savedJourney =
                        localStorage.getItem(JOURNEY_STORAGE_KEY) || "";
                } catch (error) {
                    console.error("READ SAVED JOURNEY ERROR:", error);
                }

                if (
                    savedJourney &&
                    list.some(
                        (journey) =>
                            String(journey.id) === String(savedJourney)
                    )
                ) {
                    return String(savedJourney);
                }

                return list.length ? String(list[0].id) : "";
            });
        } catch (error) {
            console.error("JOURNEYS LOAD ERROR:", error);
            console.error(
                "JOURNEYS RESPONSE ERROR:",
                error.response?.data
            );

            setJourneys([]);
            setSelectedJourney("");
        } finally {
            setJourneysLoading(false);
        }
    };

    loadJourneys();
}, []);
    /* =========================================================
       CHAT MESSAGES
    ========================================================== */

    const [messages, setMessages] =
        useState(() => {
            try {
                const saved =
                    localStorage.getItem(
                        MESSAGES_STORAGE_KEY
                    );

                if (!saved) {
                    return [];
                }

                const parsed =
                    JSON.parse(saved);

                return Array.isArray(parsed)
                    ? parsed
                    : [];
            } catch (error) {
                console.error(
                    "LOAD MESSAGES ERROR:",
                    error
                );

                return [];
            }
        });

    /* =========================================================
       INPUT
    ========================================================== */

    const [input, setInput] =
        useState(() => {
            try {
                return (
                    localStorage.getItem(
                        INPUT_STORAGE_KEY
                    ) || ""
                );
            } catch (error) {
                console.error(
                    "LOAD INPUT ERROR:",
                    error
                );

                return "";
            }
        });

    /* =========================================================
       LOADING
    ========================================================== */

    const [loading, setLoading] =
        useState(false);

    /* =========================================================
       SESSION
    ========================================================== */

    const [session, setSession] =
        useState(() => {
            try {
                const saved =
                    localStorage.getItem(
                        SESSION_STORAGE_KEY
                    );

                if (!saved) {
                    return null;
                }

                return JSON.parse(saved);
            } catch (error) {
                console.error(
                    "LOAD SESSION ERROR:",
                    error
                );

                return null;
            }
        });

    /* =========================================================
       QR MESSAGE
    ========================================================== */

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    | Do NOT load old QR message from localStorage.
    |
    | Otherwise old "Hi" can remain even after workflow changes.
    |--------------------------------------------------------------------------
    */

    const [qrMessage, setQrMessage] =
        useState("");

    const [copied, setCopied] =
        useState(false);

    /* =========================================================
       CHAT SCROLL
    ========================================================== */

    const chatRef = useRef(null);

    /* =========================================================
       CLEAN MOBILE
    ========================================================== */

    const cleanMobile =
        mobile.replace(/\D/g, "");

    /* =========================================================
       SELECTED JOURNEY DATA
    ========================================================== */

    const selectedJourneyData =
        useMemo(() => {
            return journeys.find(
                (journey) =>
                    String(journey.id) ===
                    String(selectedJourney)
            );
        }, [
            journeys,
            selectedJourney,
        ]);

    /* =========================================================
       SELECTED JOURNEY NAME
    ========================================================== */

    const selectedJourneyName =
        selectedJourneyData?.name || "";

    /* =========================================================
       DYNAMIC JOURNEY TRIGGER
    ========================================================== */

    const selectedJourneyTrigger =
        useMemo(() => {
            return normalizeJourneyTrigger(
                selectedJourneyData
            );
        }, [selectedJourneyData]);

    /* =========================================================
       DEBUG JOURNEY
    ========================================================== */

    useEffect(() => {
        console.log(
            "SELECTED JOURNEY:",
            selectedJourneyData
        );

        console.log(
            "SELECTED JOURNEY TRIGGER:",
            selectedJourneyTrigger
        );
    }, [
        selectedJourneyData,
        selectedJourneyTrigger,
    ]);

    /* =========================================================
       DYNAMIC QR MESSAGE
    ========================================================== */

    useEffect(() => {
        /*
        |--------------------------------------------------------------------------
        | No journey
        |--------------------------------------------------------------------------
        */

        if (!selectedJourneyData) {
            setQrMessage("");
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Dynamic trigger
        |--------------------------------------------------------------------------
        */

        if (selectedJourneyTrigger) {
            setQrMessage(
                selectedJourneyTrigger
            );

            /*
            |--------------------------------------------------------------------------
            | Also update localStorage so old value
            | cannot come back.
            |--------------------------------------------------------------------------
            */

            try {
                localStorage.setItem(
                    QR_MESSAGE_STORAGE_KEY,
                    selectedJourneyTrigger
                );
            } catch (error) {
                console.error(
                    "SAVE DYNAMIC QR MESSAGE ERROR:",
                    error
                );
            }

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | No trigger configured
        |--------------------------------------------------------------------------
        */

        setQrMessage("");

        try {
            localStorage.removeItem(
                QR_MESSAGE_STORAGE_KEY
            );
        } catch (error) {
            console.error(
                "REMOVE QR MESSAGE ERROR:",
                error
            );
        }
    }, [
        selectedJourneyData,
        selectedJourneyTrigger,
    ]);

    /* =========================================================
       QR URL
    ========================================================== */

    const whatsappQrUrl = useMemo(() => {
        if (
            !cleanMobile ||
            !qrMessage.trim()
        ) {
            return "";
        }

        return `https://wa.me/${cleanMobile}?text=${encodeURIComponent(
            qrMessage.trim()
        )}`;
    }, [
        cleanMobile,
        qrMessage,
    ]);

    /* =========================================================
       AUTO SCROLL
    ========================================================== */

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop =
                chatRef.current.scrollHeight;
        }
    }, [messages, loading]);

    /* =========================================================
       PERSIST MOBILE
    ========================================================== */

    useEffect(() => {
        try {
            localStorage.setItem(
                MOBILE_STORAGE_KEY,
                mobile
            );
        } catch (error) {
            console.error(
                "SAVE MOBILE ERROR:",
                error
            );
        }
    }, [mobile]);

    /* =========================================================
       PERSIST JOURNEY
    ========================================================== */

    useEffect(() => {
        try {
            if (selectedJourney) {
                localStorage.setItem(
                    JOURNEY_STORAGE_KEY,
                    selectedJourney
                );
            } else {
                localStorage.removeItem(
                    JOURNEY_STORAGE_KEY
                );
            }
        } catch (error) {
            console.error(
                "SAVE JOURNEY ERROR:",
                error
            );
        }
    }, [selectedJourney]);

    /* =========================================================
       PERSIST MESSAGES
    ========================================================== */

    useEffect(() => {
        try {
            localStorage.setItem(
                MESSAGES_STORAGE_KEY,
                JSON.stringify(messages)
            );
        } catch (error) {
            console.error(
                "SAVE MESSAGES ERROR:",
                error
            );
        }
    }, [messages]);

    /* =========================================================
       PERSIST INPUT
    ========================================================== */

    useEffect(() => {
        try {
            if (input) {
                localStorage.setItem(
                    INPUT_STORAGE_KEY,
                    input
                );
            } else {
                localStorage.removeItem(
                    INPUT_STORAGE_KEY
                );
            }
        } catch (error) {
            console.error(
                "SAVE INPUT ERROR:",
                error
            );
        }
    }, [input]);

    /* =========================================================
       PERSIST SESSION
    ========================================================== */

    useEffect(() => {
        try {
            if (session) {
                localStorage.setItem(
                    SESSION_STORAGE_KEY,
                    JSON.stringify(session)
                );
            } else {
                localStorage.removeItem(
                    SESSION_STORAGE_KEY
                );
            }
        } catch (error) {
            console.error(
                "SAVE SESSION ERROR:",
                error
            );
        }
    }, [session]);

    /* =========================================================
       PERSIST QR MESSAGE
    ========================================================== */

    useEffect(() => {
        if (!qrMessage) {
            return;
        }

        try {
            localStorage.setItem(
                QR_MESSAGE_STORAGE_KEY,
                qrMessage
            );
        } catch (error) {
            console.error(
                "SAVE QR MESSAGE ERROR:",
                error
            );
        }
    }, [qrMessage]);

    /* =========================================================
       ADD USER MESSAGE
    ========================================================== */

    const addUserMessage =
        useCallback((text) => {
            if (!text) {
                return;
            }

            setMessages((current) => [
                ...current,
                {
                    id: `user-${Date.now()}-${Math.random()}`,
                    direction: "out",
                    type: "text",
                    text,
                    time: getTime(),
                },
            ]);
        }, []);

    /* =========================================================
       ADD BOT MESSAGE
    ========================================================== */

    const addBotMessage =
        useCallback((text) => {
            if (!text) {
                return;
            }

            setMessages((current) => [
                ...current,
                {
                    id: `bot-${Date.now()}-${Math.random()}`,
                    direction: "in",
                    type: "text",
                    text,
                    payload: {},
                    time: getTime(),
                },
            ]);
        }, []);

    /* =========================================================
       APPEND BOT MESSAGES
    ========================================================== */

    const appendBotMessages =
        useCallback((botMessages) => {
            if (
                !Array.isArray(
                    botMessages
                ) ||
                botMessages.length === 0
            ) {
                return;
            }

            setMessages((current) => {
                const existingBackendIds =
                    new Set(
                        current
                            .map(
                                (message) =>
                                    message.backendId
                            )
                            .filter(Boolean)
                            .map(String)
                    );

                const newMessages =
                    botMessages
                        .filter((msg) => {
                            if (!msg?.id) {
                                return true;
                            }

                            return !existingBackendIds.has(
                                String(msg.id)
                            );
                        })
                        .map(
                            (
                                msg,
                                index
                            ) => ({
                                id: `bot-${
                                    msg.id ||
                                    index
                                }-${Date.now()}-${Math.random()}`,

                                backendId:
                                    msg.id ||
                                    null,

                                direction:
                                    "in",

                                type:
                                    msg.message_type ||
                                    "text",

                                text:
                                    msg.text ||
                                    "",

                                payload:
                                    msg.payload ||
                                    {},

                                time:
                                    getTime(),
                            })
                        );

                if (
                    newMessages.length ===
                    0
                ) {
                    return current;
                }

                return [
                    ...current,
                    ...newMessages,
                ];
            });
        }, []);

    /* =========================================================
       SEND WEBHOOK
    ========================================================== */

    const sendWebhook =
        useCallback(
            async (payload) => {
                if (loading) {
                    return;
                }

                if (!selectedJourney) {
                    addBotMessage(
                        "⚠️ Please select a Journey first."
                    );

                    return;
                }

                try {
                    setLoading(true);

                    /* -----------------------------------------------------
                       USER MESSAGE
                    ------------------------------------------------------ */

                    let outgoingText = "";

                    if (
                        payload.type ===
                        "text"
                    ) {
                        outgoingText =
                            payload.text
                                ?.body ||
                            "";
                    }

                    if (
                        payload.type ===
                        "interactive"
                    ) {
                        outgoingText =
                            payload
                                .interactive
                                ?.title ||
                            payload
                                .interactive
                                ?.button_reply
                                ?.title ||
                            "";
                    }

                    if (outgoingText) {
                        addUserMessage(
                            outgoingText
                        );
                    }

                    /* -----------------------------------------------------
                       FINAL PAYLOAD
                    ------------------------------------------------------ */

                    const finalPayload = {
                        ...payload,

                        from:
                            cleanMobile ||
                            payload.from ||
                            mobile,
                    };

                    /*
                    |--------------------------------------------------------------------------
                    | IMPORTANT
                    |--------------------------------------------------------------------------
                    | No workflow_id here.
                    |
                    | Backend must determine workflow using keyword.
                    |--------------------------------------------------------------------------
                    */

                    console.log(
                        "WEBHOOK REQUEST:",
                        finalPayload
                    );

                    /* -----------------------------------------------------
                       LARAVEL WEBHOOK
                    ------------------------------------------------------ */

                    const response =
                        await axios.post(
                            `${API}/webhooks/whatsapp`,
                            finalPayload,
                            {
                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    Accept:
                                        "application/json",
                                },
                            }
                        );

                    console.log(
                        "WEBHOOK RESPONSE:",
                        response.data
                    );

                    /* -----------------------------------------------------
                       SESSION
                    ------------------------------------------------------ */

                    if (
                        response.data
                            ?.session
                    ) {
                        setSession(
                            response.data
                                .session
                        );
                    }

                    /* -----------------------------------------------------
                       BOT MESSAGES
                    ------------------------------------------------------ */

                    const botMessages =
                        response.data
                            ?.messages ||
                        [];

                    console.log(
                        "BOT MESSAGES:",
                        botMessages
                    );

                    appendBotMessages(
                        botMessages
                    );

                    /* -----------------------------------------------------
                       SIMPLE BACKEND MESSAGE
                    ------------------------------------------------------ */

                    if (
                        botMessages.length ===
                            0 &&
                        response.data?.message
                    ) {
                        addBotMessage(
                            response.data
                                .message
                        );
                    }
                } catch (error) {
                    console.error(
                        "WHATSAPP SIMULATOR ERROR:",
                        error
                    );

                    console.error(
                        "ERROR RESPONSE:",
                        error.response
                            ?.data
                    );

                    const errorMessage =
                        error.response
                            ?.data
                            ?.message ||
                        error.response
                            ?.data
                            ?.error ||
                        "⚠️ Unable to connect to Laravel webhook.";

                    addBotMessage(
                        errorMessage
                    );
                } finally {
                    setLoading(false);
                }
            },
            [
                loading,
                selectedJourney,
                cleanMobile,
                mobile,
                addUserMessage,
                addBotMessage,
                appendBotMessages,
            ]
        );

    /* =========================================================
       SEND TEXT
    ========================================================== */

    const sendText = async () => {
        const text =
            input.trim();

        if (
            !text ||
            loading ||
            !selectedJourney ||
            !cleanMobile
        ) {
            return;
        }

        setInput("");

        await sendWebhook({
            from: cleanMobile,

            type: "text",

            text: {
                body: text,
            },
        });
    };

    /* =========================================================
       SEND INTERACTIVE
    ========================================================== */

    const sendInteractive =
        async (
            sourceHandle,
            title
        ) => {
            if (
                loading ||
                !selectedJourney ||
                !cleanMobile
            ) {
                return;
            }

            await sendWebhook({
                from: cleanMobile,

                type: "interactive",

                interactive: {
                    type: "menu",

                    source_handle:
                        sourceHandle,

                    title,
                },
            });
        };

    /* =========================================================
       MENU OPTION
    ========================================================== */

    const sendMenuOption =
        async (
            option,
            index
        ) => {
            const sourceHandle =
                option?.source_handle ||
                option?.sourceHandle ||
                `source-option-${index}`;

            const title =
                option?.label ||
                option?.title ||
                `Option ${index + 1}`;

            await sendInteractive(
                sourceHandle,
                title
            );
        };

    /* =========================================================
       BUTTON
    ========================================================== */

    const sendButton =
        async (button) => {
            const sourceHandle =
                button?.source_handle ||
                button?.sourceHandle ||
                "source-bottom";

            const title =
                button?.title ||
                button?.label ||
                "Continue";

            await sendInteractive(
                sourceHandle,
                title
            );
        };

    /* =========================================================
       SIMULATE QR SCAN
    ========================================================== */

    const simulateQrScan =
        async () => {
            /*
            |--------------------------------------------------------------------------
            | VALIDATION
            |--------------------------------------------------------------------------
            */

            if (loading) {
                return;
            }

            if (!cleanMobile) {
                return;
            }

            if (!selectedJourney) {
                return;
            }

            /*
            |--------------------------------------------------------------------------
            | IMPORTANT
            |--------------------------------------------------------------------------
            | QR must always use selected workflow's dynamic trigger.
            |
            | Do NOT trust an old/local QR message.
            |--------------------------------------------------------------------------
            */

            const dynamicTrigger =
                selectedJourneyTrigger.trim();

            if (!dynamicTrigger) {
                addBotMessage(
                    "⚠️ Selected Journey does not have a trigger keyword."
                );

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | FORCE CURRENT JOURNEY TRIGGER
            |--------------------------------------------------------------------------
            */

            setQrMessage(
                dynamicTrigger
            );

            /*
            |--------------------------------------------------------------------------
            | CLEAR CURRENT CHAT
            |--------------------------------------------------------------------------
            */

            setMessages([]);
            setSession(null);
            setInput("");

            /*
            |--------------------------------------------------------------------------
            | RESET CURRENT WORKFLOW SESSION
            |--------------------------------------------------------------------------
            */

            try {
                await axios.post(
                    `${API}/webhooks/whatsapp/reset`,
                    {
                        from:
                            cleanMobile,

                        workflow_id:
                            Number(
                                selectedJourney
                            ),
                    }
                );
            } catch (error) {
                console.warn(
                    "QR RESET WARNING:",
                    error.response
                        ?.data ||
                        error.message
                );
            }

            /*
            |--------------------------------------------------------------------------
            | SMALL DELAY
            |--------------------------------------------------------------------------
            */

            await new Promise(
                (resolve) =>
                    setTimeout(
                        resolve,
                        250
                    )
            );

            /*
            |--------------------------------------------------------------------------
            | START JOURNEY USING DYNAMIC TRIGGER
            |--------------------------------------------------------------------------
            |
            | IMPORTANT:
            | workflow_id is NOT sent.
            |
            | Laravel will find workflow by exact trigger.
            |--------------------------------------------------------------------------
            */

            await sendWebhook({
                from:
                    cleanMobile,

                type: "text",

                text: {
                    body:
                        dynamicTrigger,
                },
            });
        };

    /* =========================================================
       RESET CHAT
    ========================================================== */

    const resetChat =
        async () => {
            if (loading) {
                return;
            }

            try {
                setLoading(true);

                await axios.post(
                    `${API}/webhooks/whatsapp/reset`,
                    {
                        from:
                            cleanMobile,

                        workflow_id:
                            selectedJourney
                                ? Number(
                                      selectedJourney
                                  )
                                : null,
                    }
                );
            } catch (error) {
                console.error(
                    "SESSION RESET ERROR:",
                    error
                );
            } finally {
                /*
                |--------------------------------------------------------------------------
                | CLEAR UI
                |--------------------------------------------------------------------------
                */

                setMessages([]);
                setSession(null);
                setInput("");

                /*
                |--------------------------------------------------------------------------
                | RESTORE DYNAMIC TRIGGER
                |--------------------------------------------------------------------------
                */

                if (
                    selectedJourneyTrigger
                ) {
                    setQrMessage(
                        selectedJourneyTrigger
                    );
                } else {
                    setQrMessage("");
                }

                setLoading(false);
            }
        };

    /* =========================================================
       COPY QR LINK
    ========================================================== */

    const copyQrLink =
        async () => {
            if (!whatsappQrUrl) {
                return;
            }

            try {
                await navigator.clipboard.writeText(
                    whatsappQrUrl
                );

                setCopied(true);

                setTimeout(() => {
                    setCopied(false);
                }, 1500);
            } catch (error) {
                console.error(
                    "COPY ERROR:",
                    error
                );
            }
        };

    /* =========================================================
       LEGACY QUICK BUTTONS
    ========================================================== */

    const quickButtons =
        useMemo(
            () => [],
            []
        );

    /* =========================================================
       RENDER MESSAGE
    ========================================================== */

    const renderMessage = (
        message,
        messageIndex
    ) => {
        const type =
            message.type ||
            "text";

        const payload =
            message.payload ||
            {};

        const isUser =
            message.direction ===
            "out";

        /*
        |--------------------------------------------------------------------------
        | MENU OPTIONS
        |--------------------------------------------------------------------------
        */

        const menuOptions =
            payload.options ||
            payload.menuOptions ||
            payload.menu_options ||
            [];

        /*
        |--------------------------------------------------------------------------
        | BUTTON
        |--------------------------------------------------------------------------
        */

        const button =
            payload.button ||
            null;

        return (
            <div
                key={
                    message.id ||
                    `message-${messageIndex}`
                }
                className={`mb-3 flex ${
                    isUser
                        ? "justify-end"
                        : "justify-start"
                }`}
            >
                <div
                    className={`max-w-[82%] rounded-xl px-3 py-2 shadow-sm ${
                        isUser
                            ? "rounded-tr-sm bg-[#d9fdd3]"
                            : "rounded-tl-sm bg-white"
                    }`}
                >
                    <div className="flex items-start gap-2">
                        {isUser ? (
                            <User
                                className="
                                    mt-0.5
                                    h-3.5
                                    w-3.5
                                    shrink-0
                                    text-slate-500
                                "
                            />
                        ) : (
                            <Bot
                                className="
                                    mt-0.5
                                    h-3.5
                                    w-3.5
                                    shrink-0
                                    text-emerald-600
                                "
                            />
                        )}

                        <div
                            className="
                                min-w-0
                                flex-1
                            "
                        >
                            {/* TEXT */}

                            {message.text && (
                                <div
                                    className="
                                        whitespace-pre-wrap
                                        break-words
                                        text-sm
                                        text-slate-800
                                    "
                                >
                                    {
                                        message.text
                                    }
                                </div>
                            )}

                            {/* MENU */}

                            {type ===
                                "menu" &&
                                menuOptions.length >
                                    0 && (
                                    <div
                                        className="
                                            mt-3
                                            space-y-2
                                        "
                                    >
                                        {menuOptions.map(
                                            (
                                                option,
                                                index
                                            ) => (
                                                <button
                                                    key={
                                                        option.id ||
                                                        `menu-option-${index}`
                                                    }
                                                    type="button"
                                                    disabled={
                                                        loading
                                                    }
                                                    onClick={() =>
                                                        sendMenuOption(
                                                            option,
                                                            index
                                                        )
                                                    }
                                                    className="
                                                        w-full
                                                        rounded-xl
                                                        border
                                                        border-slate-200
                                                        bg-white
                                                        px-4
                                                        py-2.5
                                                        text-left
                                                        text-sm
                                                        font-semibold
                                                        text-[#128c7e]
                                                        shadow-sm
                                                        transition
                                                        hover:border-emerald-200
                                                        hover:bg-emerald-50
                                                        disabled:cursor-not-allowed
                                                        disabled:opacity-50
                                                    "
                                                >
                                                    {option.label ||
                                                        option.title ||
                                                        `Option ${
                                                            index +
                                                            1
                                                        }`}
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}

                            {/* BUTTON */}

                            {type ===
                                "button" &&
                                button && (
                                    <button
                                        type="button"
                                        disabled={
                                            loading
                                        }
                                        onClick={() =>
                                            sendButton(
                                                button
                                            )
                                        }
                                        className="
                                            mt-3
                                            w-full
                                            rounded-xl
                                            bg-[#128c7e]
                                            px-4
                                            py-2.5
                                            text-sm
                                            font-semibold
                                            text-white
                                            shadow-sm
                                            transition
                                            hover:bg-[#075e54]
                                            disabled:cursor-not-allowed
                                            disabled:opacity-50
                                        "
                                    >
                                        {button.title ||
                                            button.label ||
                                            "Continue"}
                                    </button>
                                )}

                            {/* TIME */}

                            <div
                                className="
                                    mt-1
                                    text-right
                                    text-[9px]
                                    text-slate-400
                                "
                            >
                                {message.time ||
                                    getTime()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    /* =========================================================
       UI
    ========================================================== */

    return (
        <>
            <div
                className="
                    min-h-screen
                    bg-slate-100
                    p-6
                "
            >
                <div
                    className="
                        mx-auto
                        max-w-6xl
                    "
                >
                    {/* =====================================================
                        HEADER
                    ====================================================== */}

                    <div
                        className="
                            mb-5
                            flex
                            items-center
                            justify-between
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            px-5
                            py-4
                            shadow-sm
                        "
                    >
                        {/* LEFT */}

                        <div className="flex items-center gap-3">
                            {/* BACK */}

                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        "/"
                                    )
                                }
                                className="
                                    flex
                                    h-10
                                    w-10
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    text-slate-600
                                    transition
                                    hover:border-emerald-200
                                    hover:bg-emerald-50
                                    hover:text-emerald-600
                                "
                                title="Back to Workflow Builder"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>

                            <div>
                                <h1
                                    className="
                                        text-xl
                                        font-bold
                                        text-slate-900
                                    "
                                >
                                    WhatsApp Simulator
                                </h1>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    Test your Journey
                                    without Meta
                                    WhatsApp API.
                                </p>
                            </div>
                        </div>

                        {/* RESET */}

                        <button
                            type="button"
                            onClick={
                                resetChat
                            }
                            disabled={
                                loading
                            }
                            className="
                                flex
                                items-center
                                gap-2
                                rounded-lg
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-2
                                text-sm
                                font-medium
                                text-slate-700
                                hover:bg-slate-50
                                disabled:opacity-50
                            "
                        >
                            <RotateCcw className="h-4 w-4" />

                            Reset
                        </button>
                    </div>

                    {/* =====================================================
                        MAIN
                    ====================================================== */}

                    <div
                        className="
                            grid
                            items-start
                            gap-6
                            lg:grid-cols-[360px_1fr]
                        "
                    >
                        {/* =================================================
                            SETTINGS
                        ================================================== */}

                        <div
                            className="
                                space-y-5
                            "
                        >
                            {/* SIMULATOR SETTINGS */}

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-white
                                    p-5
                                    shadow-sm
                                "
                            >
                                <div
                                    className="
                                        mb-5
                                        flex
                                        items-center
                                        gap-3
                                    "
                                >
                                    <div
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-emerald-100
                                            text-emerald-600
                                        "
                                    >
                                        <Bot className="h-5 w-5" />
                                    </div>

                                    <div>
                                        <h2
                                            className="
                                                font-semibold
                                                text-slate-900
                                            "
                                        >
                                            Simulator Settings
                                        </h2>

                                        <p
                                            className="
                                                text-xs
                                                text-slate-500
                                            "
                                        >
                                            Test customer
                                        </p>
                                    </div>
                                </div>

                                {/* JOURNEY */}

                                <label
                                    className="
                                        mb-2
                                        block
                                        text-sm
                                        font-medium
                                        text-slate-700
                                    "
                                >
                                    Select Journey
                                </label>

                                <select
                                    value={
                                        selectedJourney
                                    }
                                    onChange={async (
                                        e
                                    ) => {
                                        const workflowId =
                                            e.target
                                                .value;

                                        /*
                                        |--------------------------------------------------------------------------
                                        | CHANGE JOURNEY
                                        |--------------------------------------------------------------------------
                                        */

                                        setSelectedJourney(
                                            workflowId
                                        );

                                        setMessages(
                                            []
                                        );

                                        setSession(
                                            null
                                        );

                                        setInput(
                                            ""
                                        );

                                        /*
                                        |--------------------------------------------------------------------------
                                        | Find newly selected journey immediately
                                        |--------------------------------------------------------------------------
                                        */

                                        const newJourney =
                                            journeys.find(
                                                (
                                                    journey
                                                ) =>
                                                    String(
                                                        journey.id
                                                    ) ===
                                                    String(
                                                        workflowId
                                                    )
                                            );

                                        const newTrigger =
                                            normalizeJourneyTrigger(
                                                newJourney
                                            );

                                        /*
                                        |--------------------------------------------------------------------------
                                        | DYNAMIC QR MESSAGE
                                        |--------------------------------------------------------------------------
                                        */

                                        setQrMessage(
                                            newTrigger
                                        );

                                        if (
                                            !workflowId
                                        ) {
                                            try {
                                                localStorage.removeItem(
                                                    QR_MESSAGE_STORAGE_KEY
                                                );
                                            } catch (
                                                error
                                            ) {
                                                console.error(
                                                    "REMOVE QR STORAGE ERROR:",
                                                    error
                                                );
                                            }

                                            return;
                                        }

                                        /*
                                        |--------------------------------------------------------------------------
                                        | SAVE DYNAMIC TRIGGER
                                        |--------------------------------------------------------------------------
                                        */

                                        if (
                                            newTrigger
                                        ) {
                                            try {
                                                localStorage.setItem(
                                                    QR_MESSAGE_STORAGE_KEY,
                                                    newTrigger
                                                );
                                            } catch (
                                                error
                                            ) {
                                                console.error(
                                                    "SAVE QR STORAGE ERROR:",
                                                    error
                                                );
                                            }
                                        }

                                        /*
                                        |--------------------------------------------------------------------------
                                        | RESET BACKEND SESSION
                                        |--------------------------------------------------------------------------
                                        */

                                        try {
                                            const cleanMobileValue =
                                                String(
                                                    mobile
                                                ).replace(
                                                    /\D/g,
                                                    ""
                                                );

                                            if (
                                                cleanMobileValue
                                            ) {
                                                await axios.post(
                                                    `${API}/webhooks/whatsapp/reset`,
                                                    {
                                                        from:
                                                            cleanMobileValue,

                                                        workflow_id:
                                                            Number(
                                                                workflowId
                                                            ),
                                                    }
                                                );
                                            }
                                        } catch (
                                            error
                                        ) {
                                            console.error(
                                                "JOURNEY CHANGE RESET ERROR:",
                                                error
                                            );
                                        }
                                    }}
                                    disabled={
                                        journeysLoading
                                    }
                                    className="
                                        mb-4
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-300
                                        bg-white
                                        px-4
                                        py-3
                                        text-sm
                                        outline-none
                                        focus:border-emerald-500
                                        focus:ring-2
                                        focus:ring-emerald-100
                                        disabled:cursor-not-allowed
                                        disabled:bg-slate-50
                                    "
                                >
                                    <option value="">
                                        {journeysLoading
                                            ? "Loading Journeys..."
                                            : "Select Journey"}
                                    </option>

                                    {journeys.map(
                                        (
                                            journey
                                        ) => (
                                            <option
                                                key={
                                                    journey.id
                                                }
                                                value={
                                                    journey.id
                                                }
                                            >
                                                {
                                                    journey.name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>

                                {/* SELECTED JOURNEY */}

                                {selectedJourneyName && (
                                    <div
                                        className="
                                            mb-4
                                            rounded-xl
                                            bg-emerald-50
                                            px-3
                                            py-2
                                        "
                                    >
                                        <div
                                            className="
                                                text-[10px]
                                                font-bold
                                                uppercase
                                                tracking-wide
                                                text-emerald-600
                                            "
                                        >
                                            Active Journey
                                        </div>

                                        <div
                                            className="
                                                mt-0.5
                                                text-sm
                                                font-semibold
                                                text-emerald-800
                                            "
                                        >
                                            {
                                                selectedJourneyName
                                            }
                                        </div>

                                        <div
                                            className="
                                                mt-1
                                                text-[11px]
                                                text-emerald-600
                                            "
                                        >
                                            Trigger:{" "}
                                            {selectedJourneyTrigger ||
                                                "Not configured"}
                                        </div>
                                    </div>
                                )}

                                {/* MOBILE */}

                                <label
                                    className="
                                        mb-2
                                        block
                                        text-sm
                                        font-medium
                                        text-slate-700
                                    "
                                >
                                    Customer Mobile
                                </label>

                                <input
                                    type="text"
                                    value={
                                        mobile
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setMobile(
                                            e.target
                                                .value
                                        )
                                    }
                                    placeholder="919876543210"
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-300
                                        px-4
                                        py-3
                                        text-sm
                                        outline-none
                                        focus:border-emerald-500
                                        focus:ring-2
                                        focus:ring-emerald-100
                                    "
                                />

                                {/* WEBHOOK */}

                                <div
                                    className="
                                        mt-5
                                        rounded-xl
                                        bg-slate-50
                                        p-4
                                    "
                                >
                                    <div
                                        className="
                                            text-xs
                                            font-semibold
                                            uppercase
                                            tracking-wide
                                            text-slate-400
                                        "
                                    >
                                        Webhook
                                    </div>

                                    <div
                                        className="
                                            mt-2
                                            break-all
                                            text-xs
                                            text-slate-600
                                        "
                                    >
                                        {API}/webhooks/whatsapp
                                    </div>
                                </div>
                            </div>

                            {/* =================================================
                                QR CODE
                            ================================================== */}

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-white
                                    p-5
                                    shadow-sm
                                "
                            >
                                <div
                                    className="
                                        mb-4
                                        flex
                                        items-center
                                        gap-3
                                    "
                                >
                                    <div
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-purple-100
                                            text-purple-600
                                        "
                                    >
                                        <QrCode className="h-5 w-5" />
                                    </div>

                                    <div>
                                        <h2
                                            className="
                                                font-semibold
                                                text-slate-900
                                            "
                                        >
                                            WhatsApp QR Code
                                        </h2>

                                        <p
                                            className="
                                                text-xs
                                                text-slate-500
                                            "
                                        >
                                            Scan to start journey
                                        </p>
                                    </div>
                                </div>

                                {/* DEFAULT MESSAGE */}

                                <label
                                    className="
                                        mb-2
                                        block
                                        text-sm
                                        font-medium
                                        text-slate-700
                                    "
                                >
                                    Default QR Message
                                </label>

                                <input
                                    type="text"
                                    value={
                                        qrMessage
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setQrMessage(
                                            e.target
                                                .value
                                        )
                                    }
                                    placeholder={
                                        selectedJourneyTrigger ||
                                        "Journey trigger not configured"
                                    }
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-300
                                        px-4
                                        py-3
                                        text-sm
                                        outline-none
                                        focus:border-purple-500
                                        focus:ring-2
                                        focus:ring-purple-100
                                    "
                                />

                                {/* QR */}

                                {whatsappQrUrl && (
                                    <div
                                        className="
                                            mt-4
                                            flex
                                            flex-col
                                            items-center
                                        "
                                    >
                                        <div
                                            className="
                                                rounded-2xl
                                                border
                                                border-slate-200
                                                bg-white
                                                p-3
                                                shadow-sm
                                            "
                                        >
                                            <QRCodeSVG
                                                value={
                                                    whatsappQrUrl
                                                }
                                                size={
                                                    160
                                                }
                                                level="M"
                                                includeMargin
                                            />
                                        </div>

                                        <p
                                            className="
                                                mt-2
                                                text-center
                                                text-xs
                                                text-slate-500
                                            "
                                        >
                                            Scan this QR
                                            with WhatsApp
                                        </p>
                                    </div>
                                )}

                                {/* NO TRIGGER */}

                                {selectedJourney &&
                                    !selectedJourneyTrigger && (
                                        <div
                                            className="
                                                mt-4
                                                rounded-xl
                                                border
                                                border-amber-200
                                                bg-amber-50
                                                p-3
                                                text-xs
                                                text-amber-700
                                            "
                                        >
                                            This Journey
                                            does not have a
                                            configured trigger
                                            keyword.
                                        </div>
                                    )}

                                {/* QR LINK */}

                                {whatsappQrUrl && (
                                    <div
                                        className="
                                            mt-3
                                            rounded-xl
                                            bg-slate-50
                                            p-3
                                        "
                                    >
                                        <div
                                            className="
                                                mb-1
                                                text-[10px]
                                                font-bold
                                                uppercase
                                                tracking-wide
                                                text-slate-400
                                            "
                                        >
                                            WhatsApp Link
                                        </div>

                                        <div
                                            className="
                                                break-all
                                                text-[11px]
                                                text-slate-600
                                            "
                                        >
                                            {
                                                whatsappQrUrl
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* COPY */}

                                <button
                                    type="button"
                                    onClick={
                                        copyQrLink
                                    }
                                    disabled={
                                        !whatsappQrUrl
                                    }
                                    className="
                                        mt-3
                                        flex
                                        w-full
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-4
                                        py-2.5
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        transition
                                        hover:bg-slate-50
                                        disabled:opacity-50
                                    "
                                >
                                    {copied ? (
                                        <>
                                            <Check
                                                className="
                                                    h-4
                                                    w-4
                                                    text-emerald-600
                                                "
                                            />

                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />

                                            Copy WhatsApp Link
                                        </>
                                    )}
                                </button>

                                {/* SIMULATE QR */}

                                <button
                                    type="button"
                                    onClick={
                                        simulateQrScan
                                    }
                                    disabled={
                                        loading ||
                                        !cleanMobile ||
                                        !selectedJourney ||
                                        !selectedJourneyTrigger
                                    }
                                    className="
                                        mt-3
                                        flex
                                        w-full
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        bg-[#128c7e]
                                        px-4
                                        py-3
                                        text-sm
                                        font-bold
                                        text-white
                                        shadow-sm
                                        transition
                                        hover:bg-[#075e54]
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                >
                                    <ScanLine className="h-4 w-4" />

                                    Simulate QR Scan
                                </button>

                                <p
                                    className="
                                        mt-3
                                        text-center
                                        text-[11px]
                                        leading-5
                                        text-slate-400
                                    "
                                >
                                    QR scan simulator
                                    automatically uses
                                    the trigger configured
                                    in the selected Journey.
                                </p>
                            </div>

                            {/* =================================================
                                SESSION
                            ================================================== */}

                            {session && (
                                <div
                                    className="
                                        rounded-2xl
                                        border
                                        border-slate-200
                                        bg-white
                                        p-4
                                        shadow-sm
                                    "
                                >
                                    <div
                                        className="
                                            text-xs
                                            font-semibold
                                            uppercase
                                            tracking-wide
                                            text-slate-400
                                        "
                                    >
                                        Session
                                    </div>

                                    <div
                                        className="
                                            mt-3
                                            space-y-2
                                        "
                                    >
                                        {/* STATUS */}

                                        <div
                                            className="
                                                flex
                                                justify-between
                                                gap-3
                                            "
                                        >
                                            <span
                                                className="
                                                    text-xs
                                                    text-slate-500
                                                "
                                            >
                                                Status
                                            </span>

                                            <span
                                                className={`text-xs font-semibold ${
                                                    session.status ===
                                                    "error"
                                                        ? "text-red-600"
                                                        : session.status ===
                                                          "waiting"
                                                        ? "text-amber-600"
                                                        : session.status ===
                                                          "completed"
                                                        ? "text-blue-600"
                                                        : "text-emerald-600"
                                                }`}
                                            >
                                                {session.status ||
                                                    "active"}
                                            </span>
                                        </div>

                                        {/* CURRENT NODE */}

                                        <div
                                            className="
                                                flex
                                                justify-between
                                                gap-3
                                            "
                                        >
                                            <span
                                                className="
                                                    text-xs
                                                    text-slate-500
                                                "
                                            >
                                                Current Node
                                            </span>

                                            <span
                                                className="
                                                    max-w-[170px]
                                                    truncate
                                                    text-xs
                                                    font-semibold
                                                    text-slate-700
                                                "
                                            >
                                                {session.current_node_id ||
                                                    "—"}
                                            </span>
                                        </div>

                                        {/* JOURNEY */}

                                        <div
                                            className="
                                                flex
                                                justify-between
                                                gap-3
                                            "
                                        >
                                            <span
                                                className="
                                                    text-xs
                                                    text-slate-500
                                                "
                                            >
                                                Journey
                                            </span>

                                            <span
                                                className="
                                                    max-w-[170px]
                                                    truncate
                                                    text-xs
                                                    font-semibold
                                                    text-slate-700
                                                "
                                            >
                                                {
                                                    selectedJourneyName
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* =====================================================
                            PHONE
                        ====================================================== */}

                        <div
                            className="
                                flex
                                items-start
                                justify-center
                            "
                        >
                            <div
                                className="
                                    flex
                                    h-[680px]
                                    max-h-[680px]
                                    w-full
                                    max-w-[430px]
                                    flex-col
                                    overflow-hidden
                                    rounded-[32px]
                                    border-[8px]
                                    border-slate-800
                                    bg-[#efeae2]
                                    shadow-2xl
                                "
                            >
                                {/* HEADER */}

                                <div
                                    className="
                                        flex
                                        shrink-0
                                        items-center
                                        gap-3
                                        bg-[#075e54]
                                        px-4
                                        py-3
                                        text-white
                                    "
                                >
                                    <ArrowLeft className="h-5 w-5" />

                                    <div
                                        className="
                                            flex
                                            h-9
                                            w-9
                                            items-center
                                            justify-center
                                            rounded-full
                                            bg-white/20
                                        "
                                    >
                                        <Bot className="h-5 w-5" />
                                    </div>

                                    <div className="flex-1">
                                        <div
                                            className="
                                                text-sm
                                                font-semibold
                                            "
                                        >
                                            Journey Bot
                                        </div>

                                        <div
                                            className="
                                                text-[11px]
                                                text-white/70
                                            "
                                        >
                                            {selectedJourneyName ||
                                                "online"}
                                        </div>
                                    </div>

                                    <MoreVertical className="h-5 w-5" />
                                </div>

                                {/* CHAT */}

                                <div
                                    ref={
                                        chatRef
                                    }
                                    className="
                                        min-h-0
                                        flex-1
                                        overflow-y-auto
                                        bg-[#efeae2]
                                        p-4
                                    "
                                >
                                    <div
                                        className="
                                            mb-4
                                            text-center
                                        "
                                    >
                                        <span
                                            className="
                                                rounded-lg
                                                bg-white
                                                px-3
                                                py-1
                                                text-[10px]
                                                text-slate-500
                                                shadow-sm
                                            "
                                        >
                                            TODAY
                                        </span>
                                    </div>

                                    {/* EMPTY */}

                                    {messages.length ===
                                        0 && (
                                        <div
                                            className="
                                                flex
                                                min-h-[400px]
                                                flex-col
                                                items-center
                                                justify-center
                                                text-center
                                            "
                                        >
                                            <div
                                                className="
                                                    flex
                                                    h-16
                                                    w-16
                                                    items-center
                                                    justify-center
                                                    rounded-full
                                                    bg-white
                                                    shadow-sm
                                                "
                                            >
                                                <QrCode
                                                    className="
                                                        h-8
                                                        w-8
                                                        text-emerald-600
                                                    "
                                                />
                                            </div>

                                            <p
                                                className="
                                                    mt-4
                                                    text-sm
                                                    font-semibold
                                                    text-slate-600
                                                "
                                            >
                                                {selectedJourney
                                                    ? "Start Journey"
                                                    : "Select Journey"}
                                            </p>

                                            <p
                                                className="
                                                    mt-1
                                                    max-w-[250px]
                                                    text-xs
                                                    leading-5
                                                    text-slate-400
                                                "
                                            >
                                                {selectedJourney
                                                    ? selectedJourneyTrigger
                                                        ? `Type "${selectedJourneyTrigger}" or click "Simulate QR Scan" to start the selected WhatsApp journey.`
                                                        : "Selected Journey has no trigger keyword."
                                                    : "Select a published journey from the left panel."}
                                            </p>
                                        </div>
                                    )}

                                    {/* MESSAGES */}

                                    {messages.map(
                                        renderMessage
                                    )}

                                    {/* LOADING */}

                                    {loading && (
                                        <div
                                            className="
                                                mb-3
                                                flex
                                                justify-start
                                            "
                                        >
                                            <div
                                                className="
                                                    rounded-xl
                                                    rounded-tl-sm
                                                    bg-white
                                                    px-4
                                                    py-2.5
                                                    text-xs
                                                    text-slate-400
                                                    shadow-sm
                                                "
                                            >
                                                Typing...
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* INPUT */}

                                <div
                                    className="
                                        flex
                                        shrink-0
                                        items-center
                                        gap-2
                                        bg-[#f0f2f5]
                                        px-3
                                        py-3
                                    "
                                >
                                    <button
                                        type="button"
                                        className="
                                            text-slate-500
                                        "
                                    >
                                        <Smile className="h-5 w-5" />
                                    </button>

                                    <button
                                        type="button"
                                        className="
                                            text-slate-500
                                        "
                                    >
                                        <Paperclip className="h-5 w-5" />
                                    </button>

                                    <input
                                        value={
                                            input
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setInput(
                                                e.target
                                                    .value
                                            )
                                        }
                                        onKeyDown={(
                                            e
                                        ) => {
                                            if (
                                                e.key ===
                                                "Enter"
                                            ) {
                                                e.preventDefault();

                                                sendText();
                                            }
                                        }}
                                        disabled={
                                            loading ||
                                            !selectedJourney
                                        }
                                        placeholder={
                                            selectedJourney
                                                ? "Type a message"
                                                : "Select Journey first"
                                        }
                                        className="
                                            min-w-0
                                            flex-1
                                            rounded-full
                                            border-0
                                            bg-white
                                            px-4
                                            py-2.5
                                            text-sm
                                            outline-none
                                            disabled:bg-slate-100
                                        "
                                    />

                                    <button
                                        type="button"
                                        onClick={
                                            sendText
                                        }
                                        disabled={
                                            loading ||
                                            !input.trim() ||
                                            !selectedJourney ||
                                            !cleanMobile
                                        }
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-full
                                            bg-[#128c7e]
                                            text-white
                                            disabled:opacity-50
                                        "
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/*
|--------------------------------------------------------------------------
| TIME
|--------------------------------------------------------------------------
*/

function getTime() {
    return new Date().toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}
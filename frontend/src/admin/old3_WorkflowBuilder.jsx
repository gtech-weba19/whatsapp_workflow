import {
  Undo2,
  Redo2,
  Plus,
  Trash2,
  Save,
  Send,
  LogOut,
  Settings2,
  Workflow as WorkflowIcon,
  X,
  Plug,
  ChevronDown,
  ArrowLeft,

  // Workflow node icons
  Play,
  MessageSquare,
  MousePointerClick,
  Menu as MenuIcon,
  Keyboard,
  GitBranch,
  Globe,
  Image as ImageIcon,
  Clock3,
  Square,
  Video,
  FileText,
  Volume2,
    // ADD THESE
  Loader2,
  Upload,
  Zap,
  AlertTriangle

} from "lucide-react";

import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  reconnectEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "reactflow";

import "reactflow/dist/style.css";
import "react-toastify/dist/ReactToastify.css";

import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";


import {
  ToastContainer,
  toast,
} from "react-toastify";
import { useState,useCallback,useRef,useEffect} from "react";

/* =========================================================
   API
========================================================= */

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000/api";

/* =========================================================
   DEFAULT MENU OPTIONS
========================================================= */

const defaultMenuOptions = [
  {
    id: "option-1",
    label: "Option-1",
  },
  {
    id: "option-2",
    label: "Opton-2",
  },
  {
    id: "option-3",
    label: "Option-3",
  },
];

/* =========================================================
   CUSTOM NODE
========================================================= */

function Node({
  id,
  data,
  type,
  selected,
}) {
  const nodeStyles = {
    start: {
      wrapper: "border-emerald-200 bg-white",
      icon: "bg-emerald-100 text-emerald-600",
      dot: "bg-emerald-500",
    },

    message: {
      wrapper: "border-indigo-200 bg-white",
      icon: "bg-indigo-100 text-indigo-600",
      dot: "bg-indigo-500",
    },

    button: {
      wrapper: "border-violet-200 bg-white",
      icon: "bg-violet-100 text-violet-600",
      dot: "bg-violet-500",
    },

    menu: {
      wrapper: "border-purple-200 bg-white",
      icon: "bg-purple-100 text-purple-600",
      dot: "bg-purple-500",
    },

    userInput: {
      wrapper: "border-cyan-200 bg-white",
      icon: "bg-cyan-100 text-cyan-600",
      dot: "bg-cyan-500",
    },

    condition: {
      wrapper: "border-amber-200 bg-white",
      icon: "bg-amber-100 text-amber-600",
      dot: "bg-amber-500",
    },

    api: {
      wrapper: "border-blue-200 bg-white",
      icon: "bg-blue-100 text-blue-600",
      dot: "bg-blue-500",
    },

    image: {
      wrapper: "border-pink-200 bg-white",
      icon: "bg-pink-100 text-pink-600",
      dot: "bg-pink-500",
    },

    delay: {
      wrapper: "border-orange-200 bg-white",
      icon: "bg-orange-100 text-orange-600",
      dot: "bg-orange-500",
    },

    end: {
      wrapper: "border-slate-300 bg-white",
      icon: "bg-slate-100 text-slate-600",
      dot: "bg-slate-500",
    },
  };

  const style =
    nodeStyles[type] ||
    nodeStyles.message;

  const menuOptions =
    Array.isArray(data?.menuOptions)
      ? data.menuOptions
      : [];


const buttonOptions = [
  // DEFAULT BUTTON
  {
    title: data?.buttonText || "Button 1",
    value: data?.buttonValue || "",
    type: data?.buttonType || "reply",
    url: data?.buttonUrl || "",
  },

  // EXTRA BUTTONS
  ...(Array.isArray(data?.extraButtons)
    ? data.extraButtons
    : []),
];

 const preview =
  type === "api"
    ? data.otpEnabled
      ? `${data.apiMethod || data.method || "POST"} • ${
          data.apiUrl || "API not configured"
        } • OTP Enabled`
      : `${data.apiMethod || data.method || "GET"} • ${
          data.apiUrl || "API not configured"
        }`
    : data.message ||
      data.variable ||
      data.condition ||
      data.apiUrl ||
      data.imageUrl ||
      data.caption ||
      data.templateMediaUrl ||
      data.templateImageUrl ||
      data.templateName ||
      data.template_name ||
      data.delay
    ? data.message ||
      data.variable ||
      data.condition ||
      data.apiUrl ||
      data.imageUrl ||
      data.caption ||
      data.templateName ||
      data.template_name ||
      `${data.delay || ""} ${data.delayUnit || ""}`
    : "";

  return (
    <div
      className={`
        group
        relative
        w-[250px]
        overflow-visible
        rounded-2xl
        border
        ${style.wrapper}
        shadow-sm
        transition-all
        duration-200
        ${
          selected
            ? "ring-2 ring-indigo-500 ring-offset-2 shadow-lg"
            : "hover:-translate-y-0.5 hover:shadow-md"
        }
      `}
    >


{/* =====================================================
    DELETE NODE BUTTON
===================================================== */}

{selected && type !== "start" && (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();

      window.dispatchEvent(
        new CustomEvent("workflow-node-delete", {
          detail: {
            nodeId: id,
          },
        })
      );
    }}
    className="
      absolute
      right-[-10px]
      top-[-10px]
      z-[100]
      flex
      h-6
      w-6
      items-center
      justify-center
      rounded-full
      border
      border-white
      bg-red-500
      text-white
      shadow-md
      transition
      hover:bg-red-600
      hover:scale-110
    "
    title="Delete node"
  >
    <X className="h-3.5 w-3.5" />
  </button>
)}


      {/* =====================================================
          TARGET TOP
      ====================================================== */}

      {type !== "start" && (
        <Handle
          type="target"
          position={Position.Top}
          id="target-top"
          className="
            !h-3
            !w-3
            !border-2
            !border-white
            !bg-slate-400
          "
        />
      )}

      {/* =====================================================
          TARGET LEFT
      ====================================================== */}

      {type !== "start" && type !== "menu" && (
        <Handle
          type="target"
          position={Position.Left}
          id="target-left"
          className="
            !h-3
            !w-3
            !border-2
            !border-white
            !bg-slate-400
          "
        />
      )}

      {/* =====================================================
          HEADER
      ====================================================== */}

     <div className="flex items-center gap-3 px-4 pt-4">
  <div
    className={`
      flex
      h-10
      w-10
      shrink-0
      items-center
      justify-center
      rounded-xl
      ${style.icon}
    `}
  >
    {type === "start" ? (
      <Play className="h-5 w-5" />
    ) : type === "message" ? (
      <MessageSquare className="h-5 w-5" />
    ) : type === "button" ? (
      <MousePointerClick className="h-5 w-5" />
    ) : type === "menu" ? (
      <MenuIcon className="h-5 w-5" />
    ) : type === "userInput" ? (
      <Keyboard className="h-5 w-5" />
    ) : type === "condition" ? (
      <GitBranch className="h-5 w-5" />
   ) : type === "api" ? (
      <Keyboard className="h-5 w-5" />
      
    ) : type === "image" ? (
      <ImageIcon className="h-5 w-5" />
    ) : type === "media_template" ? (
      <ImageIcon className="h-5 w-5" />

    ) : type === "video" ? (
      <Video className="h-5 w-5" />
    ) : type === "document" ? (
      <FileText className="h-5 w-5" />
    ) : type === "pdf" ? (
      <FileText className="h-5 w-5" />
    ) : type === "audio" ? (
      <Volume2 className="h-5 w-5" />
    ) : type === "delay" ? (
      <Clock3 className="h-5 w-5" />
    ) : type === "end" ? (
      <Square className="h-5 w-5" />
    ) : (
      <span className="text-sm font-bold uppercase">
        {type.slice(0, 2)}
      </span>
    )}
  </div>

  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
      <span
        className={`
          h-2
          w-2
          shrink-0
          rounded-full
          ${style.dot}
        `}
      />

      <p className="truncate text-sm font-bold text-slate-800">
        {data.label || type}
      </p>
    </div>

    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
      {type === "userInput"
        ? "USER INPUT"
        : type === "menu"
        ? "MAIN MENU"
        : type === "media_template"
        ? "MEDIA TEMPLATE"
        : type === "api"
        ? data.otpEnabled
          ? "API • OTP"
          : "API REQUEST"
        : type}
    </p>
  </div>
</div>



      {/* =====================================================
    MAIN MENU
====================================================== */}

{type === "menu" ? (
  /* MAIN MENU */
  <div className="px-4 pb-4 pt-3">
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs leading-5 text-slate-600">
        {data.message || "Please select an option"}
      </p>

      <div className="mt-3 space-y-2">
        {menuOptions.length > 0 ? (
          menuOptions.map((option, index) => {
            const sourceHandle = `source-option-${index}`;

            return (
              <div
                key={sourceHandle}
                className="relative flex min-h-[34px] items-center rounded-lg border border-purple-100 bg-white px-3 py-2 pl-7"
              >
                <Handle
                  type="source"
                  position={Position.Left}
                  id={sourceHandle}
                  className="!absolute !left-[-7px] !top-1/2 !z-50 !h-3 !w-3 !-translate-y-1/2 !border-2 !border-white !bg-purple-500"
                />

                <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[9px] font-bold text-purple-600">
                  {index + 1}
                </span>

                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
                  {option.label || option.title || option.text || `Option ${index + 1}`}
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-[10px] italic text-slate-400">
            No menu options
          </p>
        )}
      </div>
    </div>
  </div>
) : type === "button" ? (
  /* BUTTON NODE - MENU STYLE */
  <div className="px-4 pb-4 pt-3">
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs leading-5 text-slate-600">
        {data.message || "Please select an option"}
      </p>

      <div className="mt-3 space-y-2">
        {buttonOptions.length > 0 ? (
          buttonOptions.map((button, index) => {
            const buttonType = String(
              button.type ||
              button.buttonType ||
              button.button_type ||
              "reply"
            ).toLowerCase();

            const isUrlButton = buttonType === "url";
            const sourceHandle = `source-option-${index}`;

            return (
              <div
                key={sourceHandle}
                className="
                  relative
                  flex
                  min-h-[34px]
                  items-center
                  rounded-lg
                  border
                  border-purple-100
                  bg-white
                  px-3
                  py-2
                  pl-7
                "
              >
                {!isUrlButton && (
                  <Handle
                    type="source"
                    position={Position.Left}
                    id={sourceHandle}
                    className="
                      !absolute
                      !left-[-7px]
                      !top-1/2
                      !z-50
                      !h-3
                      !w-3
                      !-translate-y-1/2
                      !cursor-crosshair
                      !border-2
                      !border-white
                      !bg-purple-500
                      hover:!bg-purple-700
                    "
                  />
                )}

                <span
                  className="
                    mr-2
                    flex
                    h-5
                    w-5
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-purple-100
                    text-[9px]
                    font-bold
                    text-purple-600
                  "
                >
                  {index + 1}
                </span>

                <span
                  className="
                    min-w-0
                    flex-1
                    truncate
                    text-[11px]
                    font-semibold
                    text-slate-700
                  "
                >
                  {button.title ||
                    button.label ||
                    button.text ||
                    `Button ${index + 1}`}
                </span>

                {isUrlButton && (
                  <span className="ml-2 text-[9px] font-semibold text-blue-600">
                    URL
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-[10px] italic text-slate-400">
            No buttons configured
          </p>
        )}
      </div>
    </div>
  </div>
) : (
  /* NORMAL CONTENT */
  <div className="px-4 pb-4 pt-3">
    {preview ? (
      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="line-clamp-2 text-xs leading-5 text-slate-600">
          {preview}
        </p>
      </div>
    ) : (
      <p className="text-xs italic text-slate-400">
        No configuration
      </p>
    )}
  </div>
)}

      {/* =====================================================
          NORMAL SOURCE BOTTOM
      ====================================================== */}

      {type !== "end" &&
        type !== "menu" && type !== "condition" && (
          <Handle
            type="source"
            position={Position.Bottom}
            id="source-bottom"
            className="
              !h-3
              !w-3
              !border-2
              !border-white
              !bg-indigo-500
            "
          />
        )}


        {/* =====================================================
    CONDITION YES / NO HANDLES
===================================================== */}

{type === "condition" && (
  <>
    {/* YES HANDLE */}
    <Handle
      type="source"
      position={Position.Bottom}
      id="source-yes"
      style={{
        left: "30%",
      }}
      className="
        !h-3
        !w-3
        !border-2
        !border-white
        !bg-green-500
      "
    />

    {/* YES LABEL */}
    <span
      className="
        absolute
        bottom-[-28px]
        left-[30%]
        -translate-x-1/2
        text-[11px]
        font-bold
        text-green-600
      "
    >
      YES
    </span>

    {/* NO HANDLE */}
    <Handle
      type="source"
      position={Position.Bottom}
      id="source-no"
      style={{
        left: "70%",
      }}
      className="
        !h-3
        !w-3
        !border-2
        !border-white
        !bg-red-500
      "
    />

    {/* NO LABEL */}
    <span
      className="
        absolute
        bottom-[-28px]
        left-[70%]
        -translate-x-1/2
        text-[11px]
        font-bold
        text-red-600
      "
    >
      NO
    </span>
  </>
)}

      {/* =====================================================
          NORMAL SOURCE RIGHT
      ====================================================== */}

      {type !== "end" &&
        type !== "menu" && (
          <Handle
            type="source"
            position={Position.Right}
            id="source-right"
            className="
              !h-3
              !w-3
              !border-2
              !border-white
              !bg-indigo-500
            "
          />
        )}
    </div>
  );
}

/* =========================================================
   NODE COMPONENTS
========================================================= */

const StartNode = (props) => (
  <Node {...props} type="start" />
);

const MessageNode = (props) => (
  <Node {...props} type="message" />
);

const ButtonNode = (props) => (
  <Node {...props} type="button" />
);

const MenuNode = (props) => (
  <Node {...props} type="menu" />
);

const UserInputNode = (props) => (
  <Node {...props} type="userInput" />
);

const MediaNode = (props) => (
  <Node {...props} type="media" />
);


const ImageNode = (props) => (
    <Node {...props} type="image" />
);

const MediaTemplateNode = (props) => (
  <Node {...props} type="media_template" />
);

const VideoNode = (props) => (
    <Node {...props} type="video" />
);

const DocumentNode = (props) => (
    <Node {...props} type="document" />
);

const PdfNode = (props) => (
    <Node {...props} type="pdf" />
);

const AudioNode = (props) => (
    <Node {...props} type="audio" />
);

const DelayNode = (props) => (
  <Node {...props} type="delay" />
);

const EndNode = (props) => (
  <Node {...props} type="end" />
);

const ApiNode = (props) => (
  <Node {...props} type="api" />
);


/* =========================================================
   NODE TYPES
========================================================= */

const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  button: ButtonNode,
  menu: MenuNode,
  userInput: UserInputNode,
  media: MediaNode,
  image: ImageNode,
  media_template: MediaTemplateNode,
  video: VideoNode,
  document: DocumentNode,
  pdf: PdfNode,
  audio: AudioNode,
  delay: DelayNode,
  end: EndNode,
  api: ApiNode,
};
/* =========================================================
   PALETTE
========================================================= */

const palette = [
  ["start", "Start"],
  ["message", "Message"],
  ["button", "Button"],
  ["menu", "Menu"],
  ["userInput", "User Input"],
  ["api", "API"],
  ["media", "Media"],
  // ["media_template", "Media Template"],
  // ["delay", "Delay"],
  ["end", "End"],
];


const paletteIcons = {
  start: Play,
  message: MessageSquare,
  button: MousePointerClick,
  menu: MenuIcon,
  userInput: Keyboard,
  condition: GitBranch,
  // API
  api: Plug,
  media: ImageIcon,
  // MEDIA
  media_template: ImageIcon,
  delay: Clock3,
  end: Square,
};

/* =========================================================
   CONFIG COMPONENT
========================================================= */

function Config({
  node,
  nodes,
  edges,
  setNodes,
  setEdges,
  setSelected,
  pushHistory,
  onDelete,
}) {
const [form, setForm] = useState({

  // =====================================================
  // COMMON
  // =====================================================

  label: "",
  message: "",
  variable: "",


  // =====================================================
  // OTP
  // =====================================================

  otpEnabled: false,

  mobileVariable: "mobile",

  nameVariable: "name",

  otpLength: 6,

  expiryMinutes: 5,

  maxAttempts: 3,

  otpMessage:
    "Your OTP has been sent. Please enter the OTP.",

  otpVariable: "otp",

  referenceVariable: "otp_reference",

  otpVerifiedVariable: "otp_verified",


  // =====================================================
  // OTP PROVIDER
  // =====================================================

  sendOtpUrl: "",

  verifyOtpUrl: "",

  sendOtpMethod: "POST",

  verifyOtpMethod: "POST",

  sendOtpPayload: "",

  verifyOtpPayload: "",


  // =====================================================
  // BUTTON
  // =====================================================

  buttonType: "reply", 

        buttonText: "",

        buttonValue: "",

        buttonUrl: "",
        extraButtons: [],

  condition: "",


  apiName: "",

  apiUrl: "",

  apiMethod: "GET",

  apiAuthType: "none",

  apiBearerToken: "",

  apiKeyName: "",

  apiKeyValue: "",

  apiUsername: "",

  apiPassword: "",


  apiHeaders: "",


  apiQuery: "",


  apiBodyType: "json",

  apiContentType: "application/json",

  apiBody: "",

  apiFormData: "",

  apiResponseVariable: "api_response",

  apiResponsePath: "",

  apiSuccessType: "status",

  apiSuccessStatus: "200,201",

  apiSuccessField: "",

  apiSuccessValue: "",


  // =====================================================
  // API MESSAGES
  // =====================================================

  apiSuccessMessage: "",

  apiFailureMessage: "",


  // =====================================================
  // API TIMEOUT
  // =====================================================

  apiTimeout: 30,



  // =====================================================
  // MEDIA
  // =====================================================

  mediaId: "",
  mediaType: "image",
  mediaUrl: "",
  mediaName: "",
  mediaMimeType: "",

  // Document filename
  mediaFilename: "",
  fileName: "",

  // Upload state
  mediaUploading: false,

  // Media caption
  mediaBody: "",

  // =====================================================
  // TEMPLATE
  // =====================================================

  templateName: "",

  templateId: "",

  templateLanguage: "en",

  templateBody: "",


  // =====================================================
  // MEDIA TEMPLATE MEDIA
  // =====================================================

  templateMediaId: "",

  templateMediaUrl: "",

  templateImageUrl: "",

  templateMediaName: "",

  templateMediaType: "",

  templateMediaUploading: false,

  templateVariables: [],


  // =====================================================
  // DELAY
  // =====================================================

  delay: "",

  delayUnit: "",


  // =====================================================
  // MENU
  // =====================================================

  menuOptions: defaultMenuOptions,


  // =====================================================
// USER INPUT
// =====================================================

required: true,

allowSkip: false,

skipText: "skip",

validationType: "text",

validationMessage:
  "⚠️ Please enter a valid response.",

requiredMessage:
  "⚠️ This field is required. Please enter a valid response.",

minLength: "",

maxLength: "",

minValue: "",

maxValue: "",

regex: "",


// =====================================================
// DATE VALIDATION
// =====================================================

dateFormat: "YYYY-MM-DD",

minDate: "",

maxDate: "",


// =====================================================
// TIME VALIDATION
// =====================================================

timeFormat: "HH:mm",

minTime: "",

maxTime: "",


// =====================================================
// DATE & TIME VALIDATION
// =====================================================

dateTimeFormat: "YYYY-MM-DD HH:mm",

minDateTime: "",

maxDateTime: "",


// =====================================================
// CITY VALIDATION
// =====================================================

cityValidation: "any",

  // =====================================================
  // START
  // =====================================================

  triggerText: "",

  triggerType: "keyword",

});


  const [uploadingMedia, setUploadingMedia] =
    useState("");

  // =======================================================
  // LOAD NODE
  // =======================================================

  useEffect(() => {
    if (!node) {
      return;
    }

    let menuOptions = node.data?.menuOptions;

    if (!Array.isArray(menuOptions)) {
      menuOptions = defaultMenuOptions;
    }

    setForm({
      label:
        node.data?.label || "",

      message:
        node.data?.message || "",

      variable:
        node.data?.variable || "",

      // ===================================================
// BUTTON CONFIG
// ===================================================

buttonType:
  node.data?.buttonType ??
  node.data?.button_type ??
  "reply",

buttonText:
  node.data?.buttonText ??
  node.data?.button_text ??
  "",

buttonValue:
  node.data?.buttonValue ??
  node.data?.button_value ??
  "",

buttonUrl:
  node.data?.buttonUrl ??
  node.data?.button_url ??
  node.data?.url ??
  "",


  extraButtons: Array.isArray(node.data?.extraButtons)
  ? node.data.extraButtons
  : Array.isArray(node.data?.extra_buttons)
  ? node.data.extra_buttons
  : [],

      condition:
        node.data?.condition || "",

        // ===================================================
        // START TRIGGER
        // ===================================================

        triggerText:
          node.data?.triggerText ||
          node.data?.trigger_text ||
          "",

        triggerType:
          node.data?.triggerType ||
          node.data?.trigger_type ||
          "keyword",

    // ===================================================
    // API CONFIG
    // ===================================================

    apiName:
      node.data?.apiName ??
      node.data?.api_name ??
      "",

    apiUrl:
      node.data?.apiUrl ??
      node.data?.api_url ??
      "",

    apiMethod:
      node.data?.apiMethod ??
      node.data?.api_method ??
      node.data?.method ??
      "GET",

    // ===================================================
    // API AUTHENTICATION
    // ===================================================

    apiAuthType:
      node.data?.apiAuthType ??
      node.data?.api_auth_type ??
      "none",

    apiBearerToken:
      node.data?.apiBearerToken ??
      node.data?.api_bearer_token ??
      "",

    apiKeyName:
      node.data?.apiKeyName ??
      node.data?.api_key_name ??
      "",

    apiKeyValue:
      node.data?.apiKeyValue ??
      node.data?.api_key_value ??
      "",

    apiUsername:
      node.data?.apiUsername ??
      node.data?.api_username ??
      "",

    apiPassword:
      node.data?.apiPassword ??
      node.data?.api_password ??
      "",

    // ===================================================
    // API HEADERS
    // ===================================================

    apiHeaders:
      typeof node.data?.apiHeaders === "object" &&
      node.data?.apiHeaders !== null
        ? JSON.stringify(
            node.data.apiHeaders,
            null,
            2
          )
        : typeof node.data?.api_headers === "object" &&
          node.data?.api_headers !== null
        ? JSON.stringify(
            node.data.api_headers,
            null,
            2
          )
        : node.data?.apiHeaders ??
          node.data?.api_headers ??
          "",

    // ===================================================
    // API QUERY PARAMETERS
    // ===================================================

    apiQuery:
      typeof node.data?.apiQuery === "object" &&
      node.data?.apiQuery !== null
        ? JSON.stringify(
            node.data.apiQuery,
            null,
            2
          )
        : typeof node.data?.api_query === "object" &&
          node.data?.api_query !== null
        ? JSON.stringify(
            node.data.api_query,
            null,
            2
          )
        : node.data?.apiQuery ??
          node.data?.api_query ??
          "",

    // ===================================================
    // API PAYLOAD TYPE
    // ===================================================

    apiBodyType:
      node.data?.apiBodyType ??
      node.data?.api_body_type ??
      "json",

    // ===================================================
    // API CONTENT TYPE
    // ===================================================

    apiContentType:
      node.data?.apiContentType ??
      node.data?.api_content_type ??
      (
        node.data?.apiBodyType === "form"
          ? "application/x-www-form-urlencoded"
          : node.data?.apiBodyType === "xml"
          ? "application/xml"
          : node.data?.apiBodyType === "raw"
          ? "text/plain"
          : "application/json"
      ),

    // ===================================================
    // API JSON / RAW / XML BODY
    // ===================================================

    apiBody:
      typeof node.data?.apiBody === "object" &&
      node.data?.apiBody !== null
        ? JSON.stringify(
            node.data.apiBody,
            null,
            2
          )
        : typeof node.data?.api_body === "object" &&
          node.data?.api_body !== null
        ? JSON.stringify(
            node.data.api_body,
            null,
            2
          )
        : node.data?.apiBody ??
          node.data?.api_body ??
          "",

    // ===================================================
    // API FORM DATA
    // ===================================================

    apiFormData:
      typeof node.data?.apiFormData === "object" &&
      node.data?.apiFormData !== null
        ? JSON.stringify(
            node.data.apiFormData,
            null,
            2
          )
        : typeof node.data?.api_form_data === "object" &&
          node.data?.api_form_data !== null
        ? JSON.stringify(
            node.data.api_form_data,
            null,
            2
          )
        : node.data?.apiFormData ??
          node.data?.api_form_data ??
          "",

    // ===================================================
    // API RESPONSE
    // ===================================================

    apiResponseVariable:
      node.data?.apiResponseVariable ??
      node.data?.api_response_variable ??
      "api_response",

    apiResponsePath:
      node.data?.apiResponsePath ??
      node.data?.api_response_path ??
      "",

    // ===================================================
    // API SUCCESS / CONFIRMATION
    // ===================================================

    apiSuccessType:
      node.data?.apiSuccessType ??
      node.data?.api_success_type ??
      "status",

    apiSuccessStatus:
      node.data?.apiSuccessStatus ??
      node.data?.api_success_status ??
      "200,201",

    apiSuccessField:
      node.data?.apiSuccessField ??
      node.data?.api_success_field ??
      "",

    apiSuccessValue:
      node.data?.apiSuccessValue ??
      node.data?.api_success_value ??
      "",

    // ===================================================
    // API MESSAGES
    // ===================================================

    apiSuccessMessage:
      node.data?.apiSuccessMessage ??
      node.data?.api_success_message ??
      "",

    apiFailureMessage:
      node.data?.apiFailureMessage ??
      node.data?.api_failure_message ??
      "",

    // ===================================================
    // API TIMEOUT
    // ===================================================

    apiTimeout:
      Number(
        node.data?.apiTimeout ??
        node.data?.api_timeout ??
        30
      ),


// ===================================================
// OTP CONFIG - INSIDE API NODE
// ===================================================


otpPayload:
  typeof node.data?.otpPayload === "object"
    ? JSON.stringify(
        node.data.otpPayload,
        null,
        2
      )
    : node.data?.otpPayload ??
      node.data?.otp_payload ??
      "",


// ===================================================
// OTP CONFIG - INSIDE API NODE
// ===================================================

otpEnabled:
  node.data?.otpEnabled !== undefined
    ? Boolean(node.data.otpEnabled)
    : node.data?.otp_enabled !== undefined
    ? Boolean(node.data.otp_enabled)
    : false,


// ===================================================
// OTP API URL
// ===================================================

otpUrl:
  node.data?.otpUrl ??
  node.data?.otp_url ??
  "",


// ===================================================
// OTP API METHOD
// ===================================================

otpMethod:
  node.data?.otpMethod ??
  node.data?.otp_method ??
  "POST",


// ===================================================
// MOBILE VARIABLE
// ===================================================

mobileVariable:
  node.data?.mobileVariable ??
  node.data?.mobile_variable ??
  "mobile",


// ===================================================
// NAME VARIABLE
// ===================================================

nameVariable:
  node.data?.nameVariable ??
  node.data?.name_variable ??
  "name",


// ===================================================
// OTP LENGTH
// ===================================================

otpLength:
  Number(
    node.data?.otpLength ??
    node.data?.otp_length ??
    6
  ),


// ===================================================
// EXPIRY
// ===================================================

expiryMinutes:
  Number(
    node.data?.expiryMinutes ??
    node.data?.expiry_minutes ??
    5
  ),


// ===================================================
// MAX ATTEMPTS
// ===================================================

maxAttempts:
  Number(
    node.data?.maxAttempts ??
    node.data?.max_attempts ??
    3
  ),


// ===================================================
// OTP MESSAGE
// ===================================================

otpMessage:
  node.data?.otpMessage ??
  node.data?.otp_message ??
  "Your OTP has been sent. Please enter the OTP.",


// ===================================================
// OTP VARIABLE
// ===================================================

otpVariable:
  node.data?.otpVariable ??
  node.data?.otp_variable ??
  "otp",


// ===================================================
// REFERENCE VARIABLE
// ===================================================

referenceVariable:
  node.data?.referenceVariable ??
  node.data?.reference_variable ??
  "otp_reference",


// ===================================================
// VERIFIED VARIABLE
// ===================================================

otpVerifiedVariable:
  node.data?.otpVerifiedVariable ??
  node.data?.otp_verified_variable ??
  "otp_verified",

      // ===================================================
      // MEDIA
      // ===================================================

      // mediaId:
      //   node.data?.mediaId || "",

      // imageUrl:
      //   node.data?.imageUrl || "",

      // videoUrl:
      //   node.data?.videoUrl || "",

      // documentUrl:
      //   node.data?.documentUrl || "",

      // audioUrl:
      //   node.data?.audioUrl || "",

      // mediaUrl:
      //   node.data?.mediaUrl || "",

      // fileName:
      //   node.data?.fileName || "",

      // caption:
      //   node.data?.caption || "",

      // mediaType:
      //   node.data?.mediaType || "",

  
  // ===================================================
// NORMAL MEDIA
// ===================================================

mediaId:
  node.data?.mediaId ??
  node.data?.media_id ??
  "",

mediaType:
  node.data?.mediaType ??
  node.data?.media_type ??
  "image",

mediaUrl:
  node.data?.mediaUrl ??
  node.data?.media_url ??
  node.data?.url ??
  "",

mediaName:
  node.data?.mediaName ??
  node.data?.media_name ??
  node.data?.fileName ??
  node.data?.file_name ??
  "",

mediaMimeType:
  node.data?.mediaMimeType ??
  node.data?.media_mime_type ??
  node.data?.mimeType ??
  node.data?.mime_type ??
  "",

// ===================================================
// DOCUMENT FILENAME
// ===================================================

mediaFilename:
  node.data?.mediaFilename ??
  node.data?.media_filename ??
  node.data?.fileName ??
  node.data?.file_name ??
  node.data?.mediaName ??
  node.data?.media_name ??
  "",

fileName:
  node.data?.fileName ??
  node.data?.file_name ??
  node.data?.mediaFilename ??
  node.data?.media_filename ??
  node.data?.mediaName ??
  node.data?.media_name ??
  "",

// ===================================================
// UPLOAD STATE
// ===================================================

mediaUploading: false,

// ===================================================
// INTERACTIVE MEDIA BODY
// ===================================================

  mediaBody:
        node.data?.mediaBody ??
        node.data?.media_body ??
        node.data?.caption ??
        "",

// ===================================================
// INTERACTIVE MEDIA FOOTER
// ===================================================

// mediaFooter:
//   node.data?.mediaFooter ??
//   node.data?.media_footer ??
//   node.data?.footer ??
//   "",

// ===================================================
// INTERACTIVE MEDIA BUTTONS
// ===================================================

// mediaButtons:
//   Array.isArray(node.data?.mediaButtons)
//     ? node.data.mediaButtons
//     : Array.isArray(node.data?.media_buttons)
//     ? node.data.media_buttons
//     : Array.isArray(node.data?.buttons)
//     ? node.data.buttons
//     : [],

// ===================================================
// MEDIA TEMPLATE
// ===================================================

templateName:
  node.data?.templateName ||
  node.data?.template_name ||
  "",

templateId:
  node.data?.templateId ||
  node.data?.template_id ||
  "",

templateLanguage:
  node.data?.templateLanguage ||
  node.data?.template_language ||
  "en",

templateBody:
  node.data?.templateBody ||
  node.data?.template_body ||
  "",

// Primary media URL
templateMediaUrl:
  node.data?.templateMediaUrl ||
  node.data?.template_media_url ||
  node.data?.templateImageUrl ||
  node.data?.template_image_url ||
  "",

// Legacy alias
templateImageUrl:
  node.data?.templateImageUrl ||
  node.data?.template_image_url ||
  node.data?.templateMediaUrl ||
  node.data?.template_media_url ||
  "",

templateMediaId:
  node.data?.templateMediaId ||
  node.data?.template_media_id ||
  "",

templateMediaName:
  node.data?.templateMediaName ||
  node.data?.template_media_name ||
  node.data?.fileName ||
  "",

templateMediaType:
  node.data?.templateMediaType ||
  node.data?.template_media_type ||
  "",

templateMediaUploading: false,

templateVariables:
  Array.isArray(node.data?.templateVariables)
    ? node.data.templateVariables
    : Array.isArray(node.data?.template_variables)
    ? node.data.template_variables
    : [],

      // ===================================================
      // DELAY
      // ===================================================

      delay:
        node.data?.delay || "5",

      delayUnit:
        node.data?.delayUnit || "seconds",

      // ===================================================
      // MENU
      // ===================================================

    menuOptions: 
  menuOptions.map(
    (option, index) => ({
      id:
        `source-option-${index}`,

      source_handle:
        `source-option-${index}`,

      label:
        option.label ||
        option.title ||
        option.text ||
        "",
    })
  ),

      // ===================================================
      // USER INPUT CONFIG
      // ===================================================

      required:
        node.data?.required !== undefined
          ? Boolean(node.data.required)
          : true,

      allowSkip:
        node.data?.allowSkip !== undefined
          ? Boolean(node.data.allowSkip)
          : node.data?.allow_skip !== undefined
          ? Boolean(node.data.allow_skip)
          : false,

      skipText:
        node.data?.skipText ||
        node.data?.skip_text ||
        "skip",

      validationType:
        node.data?.validationType ||
        node.data?.validation_type ||
        "text",

      validationMessage:
        node.data?.validationMessage ||
        node.data?.validation_message ||
        "⚠️ Please enter a valid response.",

      requiredMessage:
        node.data?.requiredMessage ||
        node.data?.required_message ||
        "⚠️ This field is required. Please enter a valid response.",

      minLength:
        node.data?.minLength ??
        node.data?.min_length ??
        "",

      maxLength:
        node.data?.maxLength ??
        node.data?.max_length ??
        "",

      minValue:
        node.data?.minValue ??
        node.data?.min_value ??
        "",

      maxValue:
        node.data?.maxValue ??
        node.data?.max_value ??
        "",

       regex:
        node.data?.regex ||
        node.data?.validationRegex ||
        node.data?.validation_regex ||
        "",

      // ===================================================
      // DATE VALIDATION CONFIG
      // ===================================================

      dateFormat:
        node.data?.dateFormat ??
        node.data?.date_format ??
        "YYYY-MM-DD",

      minDate:
        node.data?.minDate ??
        node.data?.min_date ??
        "",

      maxDate:
        node.data?.maxDate ??
        node.data?.max_date ??
        "",

            // ===================================================
      // DATE VALIDATION CONFIG
      // ===================================================

      dateFormat:
        node.data?.dateFormat ??
        node.data?.date_format ??
        "YYYY-MM-DD",

      minDate:
        node.data?.minDate ??
        node.data?.min_date ??
        "",

      maxDate:
        node.data?.maxDate ??
        node.data?.max_date ??
        "",


      // ===================================================
      // TIME VALIDATION CONFIG
      // ===================================================

      timeFormat:
        node.data?.timeFormat ??
        node.data?.time_format ??
        "HH:mm",

      minTime:
        node.data?.minTime ??
        node.data?.min_time ??
        "",

      maxTime:
        node.data?.maxTime ??
        node.data?.max_time ??
        "",


      // ===================================================
      // DATE & TIME VALIDATION CONFIG
      // ===================================================

      dateTimeFormat:
        node.data?.dateTimeFormat ??
        node.data?.date_time_format ??
        "YYYY-MM-DD HH:mm",

      minDateTime:
        node.data?.minDateTime ??
        node.data?.min_datetime ??
        "",

      maxDateTime:
        node.data?.maxDateTime ??
        node.data?.max_datetime ??
        "",


      // ===================================================
      // CITY VALIDATION CONFIG
      // ===================================================

      cityValidation:
        node.data?.cityValidation ??
        node.data?.city_validation ??
        "any",
    });
    
  }, [node]);

  // =======================================================
  // UPDATE FIELD
  // =======================================================

  const updateField = (
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };


  // =======================================================
  // MEDIA URL UPDATE
  // =======================================================

  const updateMediaUrl = (
    field,
    value,
    mediaType
  ) => {
    setForm((previous) => ({
      ...previous,

      [field]: value,

      mediaUrl:
        value,

      mediaType:
        mediaType,
    }));
  };


  // =======================================================
// DETECT UPLOAD MEDIA TYPE
// =======================================================

const detectTemplateMediaType = (file) => {
  const mime = String(file?.type || "").toLowerCase();

  if (mime.startsWith("image/")) {
    return "image";
  }

  if (mime.startsWith("video/")) {
    return "video";
  }

  if (mime.startsWith("audio/")) {
    return "audio";
  }

  if (
    mime === "application/pdf"
  ) {
    return "document";
  }

  if (
    mime.includes("msword") ||
    mime.includes("wordprocessingml") ||
    mime.includes("ms-excel") ||
    mime.includes("spreadsheet") ||
    mime.includes("ms-powerpoint") ||
    mime.includes("presentation") ||
    mime.startsWith("text/")
  ) {
    return "document";
  }

  return "document";
};

// =======================================================
// DETECT MEDIA TYPE FROM URL
// =======================================================

const detectTemplateMediaTypeFromUrl = (url) => {
  if (!url) {
    return "";
  }

  const cleanUrl = String(url)
    .split("?")[0]
    .split("#")[0]
    .toLowerCase();

  if (
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
      cleanUrl
    )
  ) {
    return "image";
  }

  if (
    /\.(mp4|3gp|mov|webm|mkv)$/i.test(
      cleanUrl
    )
  ) {
    return "video";
  }

  if (
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(
      cleanUrl
    )
  ) {
    return "audio";
  }

  if (
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(
      cleanUrl
    )
  ) {
    return "document";
  }

  return "";
};



// =======================================================
// UPLOAD TEMPLATE MEDIA
// =======================================================

const uploadTemplateMedia = async (file) => {
  if (!file) {
    return;
  }

  const maxSize = 50 * 1024 * 1024;

  if (file.size > maxSize) {
    toast.error(
      "Maximum file size is 50 MB."
    );

    return;
  }

  try {
    updateField(
      "templateMediaUploading",
      true
    );

    const mediaType =
      detectTemplateMediaType(file);

    const formData = new FormData();

    // Same working media upload API
    formData.append(
      "media",
      file
    );

    formData.append(
      "media_type",
      mediaType
    );

    // ===================================================
    // WORKFLOW ID
    // ===================================================

    const workflowId =
      node?.data?.workflow_id ||
      node?.data?.workflowId ||
      null;

    if (workflowId) {
      formData.append(
        "workflow_id",
        String(workflowId)
      );
    }

    // ===================================================
    // API CALL
    // ===================================================

    const token =
      localStorage.getItem("token");

    const response = await axios.post(
      `${API}/upload/media`,
      formData,
      {
        headers: {
          Accept:
            "application/json",

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),
        },
      }
    );

    const media =
      response?.data?.media;

    if (!media?.url) {
      throw new Error(
        "Upload response URL missing."
      );
    }

    // ===================================================
    // UPLOADED URL
    // ===================================================

    const uploadedUrl =
      media.url;

    // ===================================================
    // FILE NAME
    // ===================================================

    const uploadedFileName =
      media.original_name ||
      media.file_name ||
      file.name;

    // ===================================================
    // MEDIA ID
    // ===================================================

    const uploadedMediaId =
      media.id || "";

    // ===================================================
    // MEDIA TYPE
    // ===================================================

    const uploadedMediaType =
      media.media_type ||
      mediaType;

    // ===================================================
    // SAVE
    // ===================================================

    setForm((previous) => ({
      ...previous,

      // New generic field
      templateMediaUrl:
        uploadedUrl,

      // Legacy field
      templateImageUrl:
        uploadedUrl,

      templateMediaId:
        uploadedMediaId,

      templateMediaName:
        uploadedFileName,

      templateMediaType:
        uploadedMediaType,

      templateMediaUploading:
        false,
    }));

    toast.success(
      `${uploadedMediaType.toUpperCase()} uploaded successfully.`
    );

  } catch (error) {
    console.error(
      "MEDIA TEMPLATE UPLOAD ERROR:",
      error
    );

    updateField(
      "templateMediaUploading",
      false
    );

    toast.error(
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Media upload failed."
    );
  }
};

  // =======================================================
  // MEDIA UPLOAD BOX
  // =======================================================

  const renderUploadBox = (
    mediaType,
    accept,
    title
  ) => {
    const isUploading =
      uploadingMedia === mediaType;

    return (
      <div
        className="
          rounded-xl
          border
          border-dashed
          border-indigo-300
          bg-indigo-50
          p-4
        "
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-indigo-700">
              {title}
            </p>

            <p className="mt-1 text-[11px] text-indigo-500">
              Maximum file size: 50 MB
            </p>
          </div>

          <label
            className={`
              cursor-pointer
              rounded-lg
              bg-indigo-600
              px-3
              py-2
              text-xs
              font-bold
              text-white
              transition
              hover:bg-indigo-700
              ${
                isUploading
                  ? "pointer-events-none opacity-60"
                  : ""
              }
            `}
          >
            {isUploading
              ? "Uploading..."
              : "Choose File"}

            <input
              type="file"
              accept={accept}
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const file =
                  e.target.files?.[0];

                if (file) {
                  uploadMedia(
                    file,
                    mediaType
                  );
                }

                // Allow selecting same file again
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {isUploading && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-indigo-100">
              <div className="h-full w-full animate-pulse rounded-full bg-indigo-500" />
            </div>

            <p className="mt-2 text-[11px] font-semibold text-indigo-600">
              Uploading {mediaType}...
            </p>
          </div>
        )}
      </div>
    );
  };



  // =======================================================
// DETECT NORMAL MEDIA TYPE
// =======================================================

const detectMediaType = (file) => {
  const mime = String(file?.type || "").toLowerCase();

  if (mime.startsWith("image/")) {
    return "image";
  }

  if (mime.startsWith("video/")) {
    return "video";
  }

  if (mime.startsWith("audio/")) {
    return "audio";
  }

  if (
    mime === "application/pdf"
  ) {
    return "document";
  }

  if (
    mime.includes("msword") ||
    mime.includes("wordprocessingml") ||
    mime.includes("ms-excel") ||
    mime.includes("spreadsheet") ||
    mime.includes("ms-powerpoint") ||
    mime.includes("presentation") ||
    mime.startsWith("text/")
  ) {
    return "document";
  }

  return "document";
};


// =======================================================
// DETECT NORMAL MEDIA TYPE FROM URL
// =======================================================

const detectMediaTypeFromUrl = (url) => {
  if (!url) {
    return "";
  }

  const cleanUrl = String(url)
    .split("?")[0]
    .split("#")[0]
    .toLowerCase();

  if (
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
      cleanUrl
    )
  ) {
    return "image";
  }

  if (
    /\.(mp4|3gp|mov|webm|mkv)$/i.test(
      cleanUrl
    )
  ) {
    return "video";
  }

  if (
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(
      cleanUrl
    )
  ) {
    return "audio";
  }

  if (
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(
      cleanUrl
    )
  ) {
    return "document";
  }

  return "";
};


// =======================================================
// UPLOAD NORMAL MEDIA
// =======================================================

const uploadMedia = async (
  file,
  selectedMediaType = ""
) => {
  if (!file) {
    return;
  }

  // =====================================================
  // MAX FILE SIZE
  // =====================================================

  const maxSize = 50 * 1024 * 1024;

  if (file.size > maxSize) {
    toast.error(
      "Maximum file size is 50 MB."
    );
    return;
  }

  try {
    // ===================================================
    // UPLOAD STATE
    // ===================================================

    setUploadingMedia(
      selectedMediaType || "document"
    );

    updateField(
      "mediaUploading",
      true
    );

    // ===================================================
    // DETECT MEDIA TYPE
    // ===================================================

    const detectedMediaType =
      detectMediaType(file);

    const mediaType =
      selectedMediaType ||
      detectedMediaType;

    // ===================================================
    // FORM DATA
    // ===================================================

    const formData =
      new FormData();

    formData.append(
      "media",
      file
    );

    formData.append(
      "media_type",
      mediaType
    );

    // ===================================================
    // WORKFLOW ID
    // ===================================================

    const workflowId =
      node?.data?.workflow_id ||
      node?.data?.workflowId ||
      null;

    if (workflowId) {
      formData.append(
        "workflow_id",
        String(workflowId)
      );
    }

    // ===================================================
    // API TOKEN
    // ===================================================

    const token =
      localStorage.getItem("token");

    // ===================================================
    // API CALL
    // ===================================================

    const response =
      await axios.post(
        `${API}/upload/media`,
        formData,
        {
          headers: {
            Accept:
              "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },
        }
      );

    // ===================================================
    // RESPONSE
    // ===================================================

    const media =
      response?.data?.media;

    if (!media?.url) {
      throw new Error(
        "Upload response URL missing."
      );
    }

    // ===================================================
    // UPLOADED URL
    // ===================================================

    const uploadedUrl =
      media.url;

    // ===================================================
    // FILE NAME
    // ===================================================

    const uploadedFileName =
      media.original_name ||
      media.file_name ||
      file.name;

    // ===================================================
    // MEDIA ID
    // ===================================================

    const uploadedMediaId =
      media.id || "";

    // ===================================================
    // MEDIA MIME TYPE
    // ===================================================

    const uploadedMimeType =
      media.mime_type ||
      media.mimeType ||
      file.type ||
      "";

    // ===================================================
    // MEDIA TYPE FROM RESPONSE
    // ===================================================

    const uploadedMediaType =
      media.media_type ||
      media.mediaType ||
      mediaType;

    // ===================================================
    // SAVE NORMAL MEDIA DATA
    // ===================================================

    setForm((previous) => ({
      ...previous,

      mediaId:
        uploadedMediaId,

      mediaType:
        uploadedMediaType,

      mediaUrl:
        uploadedUrl,

      mediaName:
        uploadedFileName,

      mediaMimeType:
        uploadedMimeType,

      fileName:
        uploadedFileName,

      mediaUploading:
        false,
    }));

    // ===================================================
    // SUCCESS
    // ===================================================

    toast.success(
      `${uploadedMediaType.toUpperCase()} uploaded successfully.`
    );

  } catch (error) {

    // ===================================================
    // ERROR LOG
    // ===================================================

    console.error(
      "NORMAL MEDIA UPLOAD ERROR:",
      error
    );

    // ===================================================
    // RESET UPLOAD STATE
    // ===================================================

    updateField(
      "mediaUploading",
      false
    );

    // ===================================================
    // ERROR MESSAGE
    // ===================================================

    toast.error(
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Media upload failed."
    );

  } finally {

    // ===================================================
    // RESET UPLOADING TYPE
    // ===================================================

    setUploadingMedia(null);
  }
};

  // =======================================================
  // MENU OPTION UPDATE
  // =======================================================

  const updateMenuOption = (
    index,
    value
  ) => {
    setForm((previous) => {
      const options = [
        ...(previous.menuOptions || []),
      ];

      options[index] = {
        ...options[index],
        label: value,
      };

      return {
        ...previous,
        menuOptions: options,
      };
    });
  };

  // =======================================================
  // ADD MENU OPTION
  // =======================================================

  const addMenuOption = () => {
    setForm((previous) => {
      const options = [
        ...(previous.menuOptions || []),
      ];

      if (options.length >= 10) {
        toast.warning(
          "Maximum 10 menu options allowed."
        );

        return previous;
      }

      options.push({
        id:
          "option-" +
          Date.now(),

        label:
          `Option ${
            options.length + 1
          }`,
      });

      return {
        ...previous,
        menuOptions: options,
      };
    });
  };

  // =======================================================
  // REMOVE MENU OPTION
  // =======================================================

  const removeMenuOption = (
    index
  ) => {
    setForm((previous) => {
      const options = [
        ...(previous.menuOptions || []),
      ];

      if (options.length <= 1) {
        toast.warning(
          "At least one menu option is required."
        );

        return previous;
      }

      options.splice(index, 1);

      return {
        ...previous,
        menuOptions: options,
      };
    });
  };

  // =======================================================
  // APPLY CHANGES
  // =======================================================

const update = () => {
  if (!node) {
    return;
  }

    // =====================================================
  // START NODE VALIDATION
  // =====================================================

 if (node.type === "start") {
  const triggerType = String(
    form.triggerType || node.data?.triggerType || "keyword"
  ).trim().toLowerCase();

  const triggerText = String(
    form.triggerText ?? node.data?.triggerText ?? ""
  ).trim();

  if (triggerType === "keyword" && !triggerText) {
    toast.error("Please enter a Trigger Message before saving.");
    return;
  }
}


  pushHistory(
    nodes,
    edges
  );

  const updatedNode = {
    ...node,

    data: {
      ...node.data,

      ...form,

      // =================================================
      // MEDIA TEMPLATE CONFIG
      // =================================================

      templateMediaUrl:
        form.templateMediaUrl ||
        form.templateImageUrl ||
        "",

      templateImageUrl:
        form.templateMediaUrl ||
        form.templateImageUrl ||
        "",

      templateMediaId:
        form.templateMediaId ||
        "",

      templateMediaName:
        form.templateMediaName ||
        "",

      templateMediaType:
        form.templateMediaType ||
        "",


      // =================================================
      // USER INPUT CONFIG
      // =================================================

      required:
        Boolean(
          form.required
        ),

      allowSkip:
        Boolean(
          form.allowSkip
        ),

      skipText:
        String(
          form.skipText ||
            "skip"
        ).trim() ||
        "skip",

      validationType:
        String(
          form.validationType ||
            "text"
        )
          .trim()
          .toLowerCase(),

      validationMessage:
        form.validationMessage ||
        "⚠️ Please enter a valid response.",

      requiredMessage:
        form.requiredMessage ||
        "⚠️ This field is required. Please enter a valid response.",

      minLength:
        form.minLength === ""
          ? ""
          : Number(
              form.minLength
            ),

      maxLength:
        form.maxLength === ""
          ? ""
          : Number(
              form.maxLength
            ),

      minValue:
        form.minValue === ""
          ? ""
          : Number(
              form.minValue
            ),

      maxValue:
        form.maxValue === ""
          ? ""
          : Number(
              form.maxValue
            ),

      regex:
        form.regex || "",

      menuOptions:
        Array.isArray(
          form.menuOptions
        )
          ? form.menuOptions
          : [],


      // =================================================
      // OTP CONFIG
      // =================================================

      otpLength:
        form.otpLength === ""
          ? 6
          : Number(
              form.otpLength
            ),

      expiryMinutes:
        form.expiryMinutes === ""
          ? 5
          : Number(
              form.expiryMinutes
            ),

      maxAttempts:
        form.maxAttempts === ""
          ? 3
          : Number(
              form.maxAttempts
            ),

      otpMessage:
        String(
          form.otpMessage ||
            "Please enter the OTP sent to your mobile number."
        ).trim(),

      otpVariable:
        String(
          form.otpVariable ||
            "otp"
        ).trim(),

      otpVerifiedVariable:
        String(
          form.otpVerifiedVariable ||
            "otp_verified"
        ).trim(),


      // =================================================
      // OTP PROVIDER CONFIG
      // =================================================

      sendOtpUrl:
        String(
          form.sendOtpUrl ||
            ""
        ).trim(),

      verifyOtpUrl:
        String(
          form.verifyOtpUrl ||
            ""
        ).trim(),

      sendOtpMethod:
        String(
          form.sendOtpMethod ||
            "POST"
        )
          .trim()
          .toUpperCase(),

      verifyOtpMethod:
        String(
          form.verifyOtpMethod ||
            "POST"
        )
          .trim()
          .toUpperCase(),

      sendOtpPayload:
        form.sendOtpPayload || {},

      verifyOtpPayload:
        form.verifyOtpPayload || {},
    },
  };


  // =====================================================
  // UPDATE NODE
  // =====================================================

  setNodes(
    (currentNodes) =>
      currentNodes.map(
        (item) =>
          item.id === node.id
            ? updatedNode
            : item
      )
  );


  // =====================================================
  // UPDATE MENU EDGE LABELS
  // =====================================================

  if (
    node.type === "menu"
  ) {
    setEdges(
      (currentEdges) =>
        currentEdges.map(
          (edge) => {

            if (
              edge.source !==
              node.id
            ) {
              return edge;
            }

            if (
              !edge.sourceHandle?.startsWith(
                "source-option-"
              )
            ) {
              return edge;
            }

            const index =
              Number(
                edge.sourceHandle.replace(
                  "source-option-",
                  ""
                )
              );

            const option =
              form.menuOptions?.[
                index
              ];

            return {
              ...edge,

              label:
                option?.label ||
                undefined,
            };
          }
        )
    );
  }


  // =====================================================
  // SELECT UPDATED NODE
  // =====================================================

  setSelected(
    updatedNode
  );


  // =====================================================
  // SUCCESS MESSAGE
  // =====================================================

  toast.success(
    "Node configuration updated."
  );
};
  // =======================================================
  // STYLES
  // =======================================================

  const labelClass =
    "mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500";

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

  const textareaClass =
    "w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

  return (
    <div className="space-y-5">

      {/* =====================================================
          NODE LABEL
      ====================================================== */}

      <div>
        <label className={labelClass}>
          Node Label
        </label>

        <input
          type="text"
          value={form.label}
          onChange={(e) =>
            updateField(
              "label",
              e.target.value
            )
          }
          placeholder="Enter node label"
          className={inputClass}
        />
      </div>

  
{/* =====================================================
    START
====================================================== */}

{node?.type === "start" && (
  <>
    {/* TRIGGER TYPE */}

    <div>
      <label className={labelClass}>
        Start Trigger
      </label>

      <select
        value={form.triggerType}
        onChange={(e) =>
          updateField(
            "triggerType",
            e.target.value
          )
        }
        className={inputClass}
      >
        <option value="keyword">
          Keyword / Message
        </option>

     
      </select>
    </div>

    {/* TRIGGER MESSAGE */}

    {form.triggerType === "keyword" && (
      <div>
        <label className={labelClass}>
          Trigger Message
        </label>

        <input
          type="text"
          value={form.triggerText}
          onChange={(e) =>
            updateField(
              "triggerText",
              e.target.value
            )
          }
          placeholder="hi"
          className={inputClass}
        />

        <p className="mt-2 text-[11px] text-slate-400">
          Example: hi, hello, start
        </p>
      </div>
    )}

 

    {/* PREVIEW */}

    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
        Start Configuration
      </p>

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">
            Trigger
          </span>

          <span className="font-bold text-slate-700">
            {form.triggerType === "any"
              ? "Any Message"
              : form.triggerText || "Not configured"}
          </span>
        </div>

      </div>
    </div>
  </>
)}

      {/* =====================================================
          MESSAGE
      ====================================================== */}

      {node?.type === "message" && (
        <div>
          <label className={labelClass}>
            WhatsApp Message
          </label>

          <textarea
            value={form.message}
            onChange={(e) =>
              updateField(
                "message",
                e.target.value
              )
            }
            rows={6}
            placeholder="Enter WhatsApp message..."
            className={
              textareaClass
            }
          />

          <p className="mt-2 text-[11px] text-slate-400">
            Message sent to the
            customer.
          </p>
        </div>
      )}



{/* =====================================================
    BUTTON NODE
====================================================== */}

{node?.type === "button" && (
  <>
    {/* Button Message */}
    <div>
      <label className={labelClass}>Button Message</label>

      <textarea
        value={form.message || ""}
        onChange={(e) => updateField("message", e.target.value)}
        rows={5}
        maxLength={1024}
        placeholder="Please select an option..."
        className={textareaClass}
      />

      <p className="mt-1 text-right text-[11px] text-slate-500">
        {(form.message || "").length}/1024
      </p>
    </div>

    {/* First Button Type */}
    <div>
      <label className={labelClass}>Button Type</label>

      <select
        value={form.buttonType || "reply"}
        onChange={(e) => updateField("buttonType", e.target.value)}
        className={inputClass}
      >
        <option value="reply">Reply Button</option>
        <option value="url">URL Button</option>
      </select>
    </div>

    {/* First Button Text */}
    <div>
      <label className={labelClass}>Button Text</label>

      <input
        type="text"
        value={form.buttonText || ""}
        onChange={(e) => updateField("buttonText", e.target.value)}
        placeholder="Enter button text"
        maxLength={20}
        className={inputClass}
      />
    </div>



    {/* First Button URL */}
    {form.buttonType === "url" && (
      <div>
        <label className={labelClass}>Button URL</label>

        <input
          type="url"
          value={form.buttonUrl || ""}
          onChange={(e) => updateField("buttonUrl", e.target.value)}
          placeholder="https://example.com"
          className={inputClass}
        />

        <p className="mt-1 text-[11px] text-slate-500">
          Enter the complete HTTPS URL.
        </p>
      </div>
    )}

    {/* Additional Buttons */}
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label className={labelClass}>Additional Buttons</label>
          <p className="mt-1 text-xs text-slate-500">
            Maximum 3 buttons total
          </p>
        </div>

        <button
          type="button"
          disabled={(form.extraButtons || []).length >= 2}
          onClick={() => {
            const buttons = form.extraButtons || [];

            if (buttons.length >= 2) return;

            updateField("extraButtons", [
              ...buttons,
              {
                type: "reply",
                text: "",
                value: "",
                url: "",
              },
            ]);
          }}
          style={{
            backgroundColor:
              (form.extraButtons || []).length >= 2
                ? "#C4B5FD"
                : "#7C3AED",
            color: "#FFFFFF",
            border: "none",
            cursor:
              (form.extraButtons || []).length >= 2
                ? "not-allowed"
                : "pointer",
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:brightness-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add More
        </button>
      </div>

      {(form.extraButtons || []).map((button, index) => {
        const updateExtraButton = (field, value) => {
          const updated = [...(form.extraButtons || [])];

          updated[index] = {
            ...updated[index],
            [field]: value,
          };

          updateField("extraButtons", updated);
        };

        return (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-violet-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">
                Button {index + 2}
              </p>

              <button
                type="button"
                onClick={() =>
                  updateField(
                    "extraButtons",
                    (form.extraButtons || []).filter(
                      (_, i) => i !== index
                    )
                  )
                }
                className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>

            {/* Additional Button Type */}
            <div>
              <label className={labelClass}>Button Type</label>

          <select
  value={button.type || "reply"}
  onChange={(e) => {
    const value = e.target.value;

    const anotherUrlExists =
      form.buttonType === "url" ||
      (form.extraButtons || []).some(
        (item, i) => i !== index && item.type === "url"
      );

    if (value === "url" && anotherUrlExists) {
      return;
    }

    updateExtraButton("type", value);
  }}
  className={inputClass}
>
  <option value="reply">Reply Button</option>

  <option
    value="url"
    disabled={
      form.buttonType === "url" ||
      (form.extraButtons || []).some(
        (item, i) => i !== index && item.type === "url"
      )
    }
  >
    URL Button
  </option>
</select>
            </div>

            {/* Additional Button Text */}
            <div>
              <label className={labelClass}>Button Text</label>

              <input
                type="text"
                value={button.text || ""}
                onChange={(e) =>
                  updateExtraButton("text", e.target.value)
                }
                placeholder="Enter button text"
                maxLength={20}
                className={inputClass}
              />
            </div>

      

            {/* Additional URL */}
            {button.type === "url" && (
              <div>
                <label className={labelClass}>Button URL</label>

                <input
                  type="url"
                  value={button.url || ""}
                  onChange={(e) =>
                    updateExtraButton("url", e.target.value)
                  }
                  placeholder="https://example.com"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Button Preview */}
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
        Button Preview
      </p>

      <div className="mt-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
          {form.message || "Please select an option"}
        </p>

        <div className="mt-3 space-y-2">
{/* First Button Preview */}
<div className="rounded-lg bg-violet-100 px-3 py-2.5 text-center text-xs font-bold text-violet-700">
  {form.buttonType === "url" ? (
    <a
      href={form.buttonUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
      onClick={(e) => e.stopPropagation()}
    >
      ↗ {form.buttonText || "button"}
    </a>
  ) : (
    form.buttonText || "button"
  )}
</div>


          {/* Additional Buttons Preview */}
          {(form.extraButtons || []).map((button, index) => (
            <div
              key={index}
              className="rounded-lg bg-violet-100 px-3 py-2.5 text-center text-xs font-bold text-violet-700"
            >
              {button.type === "url" ? "↗ " : ""}
              {button.text || `Button ${index + 2}`}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        {(form.extraButtons || []).length + 1} of 3 buttons
      </p>
    </div>
  </>
)}

      {/* =====================================================
          MAIN MENU
      ====================================================== */}

      {node?.type === "menu" && (
        <>
        <div>
  <label className={labelClass}>
    Main Menu Message
  </label>

  <textarea
    value={form.message}
    onChange={(e) =>
      updateField("message", e.target.value)
    }
    rows={5}
    placeholder="Please select an option:"
    className={textareaClass}
  />

  <div className="mt-2 flex items-center justify-between gap-3">
    <p className="text-[11px] text-slate-400">
      This message will be shown above the menu options.
    </p>

  </div>
</div>

          {/* VARIABLE */}

          <div>
            <label className={labelClass}>
              Variable
            </label>

            <input
              type="text"
              value={form.variable}
              onChange={(e) =>
                updateField(
                  "variable",
                  e.target.value
                )
              }
              placeholder="requirement"
              className={inputClass}
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Selected menu option will be
              stored in this variable.
            </p>
          </div>

          {/* OPTIONS */}

        

<div>
  <div className="mb-2 flex items-center justify-between">
    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
      Menu Options
    </label>

    <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-600">
      {form.menuOptions?.length || 0}/10
    </span>
  </div>

  <div className="space-y-3">
    {(form.menuOptions || []).map((option, index) => {
      const label = option.label || "";
      const length = Array.from(label).length;
      const isTooLong = length > 24;

      return (
        <div
          key={option.id || index}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-xs font-bold text-purple-600">
              {index + 1}
            </div>

            <input
              type="text"
              value={label}
              onChange={(e) =>
                updateMenuOption(index, e.target.value)
              }
              placeholder={`Option ${index + 1}`}
              className={`min-w-0 flex-1 rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-4 ${
                isTooLong
                  ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/10"
                  : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10"
              }`}
            />

            <button
              type="button"
              onClick={() => removeMenuOption(index)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
              title="Remove option"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* CHARACTER VALIDATION */}
          <div className="mt-2 flex items-start justify-between gap-2 pl-11">
            {isTooLong ? (
              <p className="text-[11px] leading-4 text-amber-700">
                <span className="font-bold">Warning:</span>{" "}
                WhatsApp row title maximum 24 characters hai.
                API ke liye short title use karein.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                WhatsApp title limit: 24 characters
              </p>
            )}

            <span
              className={`shrink-0 text-[11px] font-bold ${
                isTooLong ? "text-amber-700" : "text-slate-500"
              }`}
            >
              {length}/24
            </span>
          </div>

          {/* PROVIDER TITLE PREVIEW */}
          {isTooLong && (
            <div className="mt-2 ml-11 rounded-lg border border-amber-200 bg-amber-50 p-2">
              <p className="text-[10px] font-semibold uppercase text-amber-700">
                Suggested WhatsApp title
              </p>
              <p className="mt-1 break-words text-xs text-slate-700">
                {Array.from(label).slice(0, 24).join("")}
              </p>
            </div>
          )}
        </div>
      );
    })}
  </div>

  <button
    type="button"
    onClick={addMenuOption}
    disabled={(form.menuOptions || []).length >= 10}
    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-purple-300 bg-purple-50 px-4 py-3 text-xs font-bold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <Plus className="h-4 w-4" />
    Add Menu Option
  </button>
</div>

          {/* PREVIEW */}

          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-center gap-2">
              <MenuIcon className="h-4 w-4 text-purple-600" />

              <p className="text-[10px] font-bold uppercase text-purple-500">
                Main Menu Preview
              </p>
            </div>

            <div className="mt-3 rounded-xl bg-white p-3 shadow-sm">
              <p className="text-sm leading-5 text-slate-700">
                {form.message ||
                  "Please select an option:"}
              </p>

              <div className="mt-3 space-y-1.5">
                {(form.menuOptions || []).map(
                  (option, index) => (
                    <div
                      key={
                        option.id ||
                        index
                      }
                      className="
                        flex
                        items-center
                        gap-2
                        rounded-lg
                        border
                        border-purple-100
                        px-3
                        py-2
                      "
                    >
                      <span
                        className="
                          flex
                          h-5
                          w-5
                          items-center
                          justify-center
                          rounded-full
                          bg-purple-100
                          text-[9px]
                          font-bold
                          text-purple-600
                        "
                      >
                        {index + 1}
                      </span>

                      <span className="text-xs font-semibold text-slate-700">
                        {option.label ||
                          `Option ${
                            index + 1
                          }`}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* CONNECTION INFO */}

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-[10px] font-bold uppercase text-blue-500">
              Canvas Connections
            </p>

            <p className="mt-2 text-xs leading-5 text-blue-700">
              Each menu option has its own
              connection point on the left side
              of the option. Connect each option
              to a different workflow node.
            </p>
          </div>
        </>
      )}

      {/* =====================================================
          USER INPUT
      ====================================================== */}

      {node?.type === "userInput" && (
        <>
          {/* ASK MESSAGE */}

          <div>
            <label className={labelClass}>
              Ask Message
            </label>

            <textarea
              value={form.message}
              onChange={(e) =>
                updateField(
                  "message",
                  e.target.value
                )
              }
              rows={5}
              placeholder={`Please enter your Company Name. Type "Skip" if you don't want to provide it.`}
              className={
                textareaClass
              }
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Question that will be sent to
              the customer.
            </p>
          </div>

          {/* VARIABLE */}

          <div>
            <label className={labelClass}>
              Variable
            </label>

            <input
              type="text"
              value={form.variable}
              onChange={(e) =>
                updateField(
                  "variable",
                  e.target.value
                )
              }
              placeholder="company_name"
              className={inputClass}
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Customer response will be
              stored in this variable.
            </p>
          </div>

          {/* REQUIRED */}

          <div
            className="
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              p-4
            "
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Required Field
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  Customer must provide a valid
                  value.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateField(
                    "required",
                    !form.required
                  )
                }
                className={`
                  relative
                  h-6
                  w-11
                  rounded-full
                  transition
                  ${
                    form.required
                      ? "bg-indigo-600"
                      : "bg-slate-300"
                  }
                `}
              >
                <span
                  className={`
                    absolute
                    top-1
                    h-4
                    w-4
                    rounded-full
                    bg-white
                    shadow
                    transition
                    ${
                      form.required
                        ? "left-6"
                        : "left-1"
                    }
                  `}
                />
              </button>
            </div>
          </div>

          {/* ALLOW SKIP */}

          <div
            className="
              rounded-xl
              border
              border-cyan-200
              bg-cyan-50
              p-4
            "
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-cyan-700">
                  Allow Skip
                </p>

                <p className="mt-1 text-[11px] leading-5 text-cyan-600">
                  Customer can skip this field.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateField(
                    "allowSkip",
                    !form.allowSkip
                  )
                }
                className={`
                  relative
                  h-6
                  w-11
                  rounded-full
                  transition
                  ${
                    form.allowSkip
                      ? "bg-cyan-600"
                      : "bg-slate-300"
                  }
                `}
              >
                <span
                  className={`
                    absolute
                    top-1
                    h-4
                    w-4
                    rounded-full
                    bg-white
                    shadow
                    transition
                    ${
                      form.allowSkip
                        ? "left-6"
                        : "left-1"
                    }
                  `}
                />
              </button>
            </div>

            {form.allowSkip && (
              <div className="mt-4">
                <label className={labelClass}>
                  Skip Text
                </label>

                <input
                  type="text"
                  value={
                    form.skipText
                  }
                  onChange={(e) =>
                    updateField(
                      "skipText",
                      e.target.value
                    )
                  }
                  placeholder="skip"
                  className={inputClass}
                />

                <p className="mt-2 text-[11px] text-cyan-600">
                  Example: skip, Skip, SKIP —
                  matching is case-insensitive.
                </p>
              </div>
            )}
          </div>

         {/* VALIDATION TYPE */}

        <div>
          <label className={labelClass}>
            Validation Type
          </label>

          <select
            value={form.validationType}
            onChange={(e) =>
              updateField(
                "validationType",
                e.target.value
              )
            }
            className={inputClass}
          >
            <option value="text">
              Text
            </option>

            <option value="mobile">
              Mobile Number
            </option>

            <option value="email">
              Email
            </option>

            <option value="number">
              Number
            </option>

            <option value="integer">
              Integer
            </option>

            <option value="date">
              Date
            </option>

            <option value="time">
              Time
            </option>

            <option value="datetime">
              Date & Time
            </option>

            <option value="city">
              City
            </option>

            <option value="url">
              URL
            </option>

            <option value="alpha">
              Alphabets Only
            </option>

            <option value="alphanumeric">
              Alphanumeric
            </option>

            <option value="regex">
              Custom Regex
            </option>
          </select>
        </div>

          {/* VALIDATION MESSAGE */}

          <div>
            <label className={labelClass}>
              Validation Message
            </label>

            <textarea
              value={
                form.validationMessage
              }
              onChange={(e) =>
                updateField(
                  "validationMessage",
                  e.target.value
                )
              }
              rows={3}
              placeholder="⚠️ Please enter a valid response."
              className={
                textareaClass
              }
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Message shown when the customer's
              response does not match validation.
            </p>
          </div>

          {/* REQUIRED MESSAGE */}

          <div>
            <label className={labelClass}>
              Required Message
            </label>

            <textarea
              value={
                form.requiredMessage
              }
              onChange={(e) =>
                updateField(
                  "requiredMessage",
                  e.target.value
                )
              }
              rows={3}
              placeholder="⚠️ This field is required."
              className={
                textareaClass
              }
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Message shown when an empty response
              is not allowed.
            </p>
          </div>

          {/* LENGTH VALIDATION */}

          {[
            "text",
            "alpha",
            "alphanumeric",
            "mobile",
          ].includes(
            form.validationType
          ) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Min Length
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.minLength
                  }
                  onChange={(e) =>
                    updateField(
                      "minLength",
                      e.target.value
                    )
                  }
                  placeholder="0"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Max Length
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.maxLength
                  }
                  onChange={(e) =>
                    updateField(
                      "maxLength",
                      e.target.value
                    )
                  }
                  placeholder="100"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* NUMBER RANGE */}

          {[
            "number",
            "integer",
          ].includes(
            form.validationType
          ) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Min Value
                </label>

                <input
                  type="number"
                  value={
                    form.minValue
                  }
                  onChange={(e) =>
                    updateField(
                      "minValue",
                      e.target.value
                    )
                  }
                  placeholder="0"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Max Value
                </label>

                <input
                  type="number"
                  value={
                    form.maxValue
                  }
                  onChange={(e) =>
                    updateField(
                      "maxValue",
                      e.target.value
                    )
                  }
                  placeholder="100000"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* =====================================================
              DATE VALIDATION
          ====================================================== */}

          {form.validationType === "date" && (
            <div className="space-y-4">

              {/* DATE FORMAT */}

              <div>
                <label className={labelClass}>
                  Date Format
                </label>

                <select
                  value={form.dateFormat || "YYYY-MM-DD"}
                  onChange={(e) =>
                    updateField(
                      "dateFormat",
                      e.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="YYYY-MM-DD">
                    YYYY-MM-DD
                  </option>

                  <option value="DD-MM-YYYY">
                    DD-MM-YYYY
                  </option>

                  <option value="MM-DD-YYYY">
                    MM-DD-YYYY
                  </option>

                  <option value="DD/MM/YYYY">
                    DD/MM/YYYY
                  </option>

                  <option value="MM/DD/YYYY">
                    MM/DD/YYYY
                  </option>
                </select>

                <p className="mt-2 text-[11px] text-slate-400">
                  Format in which customer should enter the date.
                </p>
              </div>

              {/* MIN DATE / MAX DATE */}

              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className={labelClass}>
                    Minimum Date
                  </label>

                  <input
                    type="date"
                    value={form.minDate || ""}
                    onChange={(e) =>
                      updateField(
                        "minDate",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />

                  <p className="mt-2 text-[11px] text-slate-400">
                    Earliest allowed date.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>
                    Maximum Date
                  </label>

                  <input
                    type="date"
                    value={form.maxDate || ""}
                    onChange={(e) =>
                      updateField(
                        "maxDate",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />

                  <p className="mt-2 text-[11px] text-slate-400">
                    Latest allowed date.
                  </p>
                </div>

              </div>

              {/* DATE PREVIEW */}

              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">

                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                  Date Validation
                </p>

                <div className="mt-3 space-y-2 text-xs">

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Format
                    </span>

                    <span className="font-bold text-slate-700">
                      {form.dateFormat || "YYYY-MM-DD"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Minimum
                    </span>

                    <span className="font-bold text-slate-700">
                      {form.minDate || "No limit"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Maximum
                    </span>

                    <span className="font-bold text-slate-700">
                      {form.maxDate || "No limit"}
                    </span>
                  </div>

                </div>

              </div>

            </div>
          )}


          {/* =====================================================
                TIME VALIDATION
            ====================================================== */}

            {form.validationType === "time" && (
            <div className="space-y-4">

                <div>
                <label className={labelClass}>
                    Time Format
                </label>

                <select
                    value={form.timeFormat || "HH:mm"}
                    onChange={(e) =>
                    updateField(
                        "timeFormat",
                        e.target.value
                    )
                    }
                    className={inputClass}
                >
                    <option value="HH:mm">
                    HH:mm
                    </option>

                    <option value="HH:mm:ss">
                    HH:mm:ss
                    </option>

                    <option value="hh:mm A">
                    hh:mm AM/PM
                    </option>
                </select>

                <p className="mt-2 text-[11px] text-slate-400">
                    Time format customer should enter.
                </p>
                </div>

                <div className="grid grid-cols-2 gap-3">

                <div>
                    <label className={labelClass}>
                    Minimum Time
                    </label>

                    <input
                    type="time"
                    value={form.minTime || ""}
                    onChange={(e) =>
                        updateField(
                        "minTime",
                        e.target.value
                        )
                    }
                    className={inputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>
                    Maximum Time
                    </label>

                    <input
                    type="time"
                    value={form.maxTime || ""}
                    onChange={(e) =>
                        updateField(
                        "maxTime",
                        e.target.value
                        )
                    }
                    className={inputClass}
                    />
                </div>

                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                    Time Validation
                </p>

                <div className="mt-3 space-y-2 text-xs">

                    <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                        Format
                    </span>

                    <span className="font-bold text-slate-700">
                        {form.timeFormat || "HH:mm"}
                    </span>
                    </div>

                    <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                        Minimum
                    </span>

                    <span className="font-bold text-slate-700">
                        {form.minTime || "No limit"}
                    </span>
                    </div>

                    <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                        Maximum
                    </span>

                    <span className="font-bold text-slate-700">
                        {form.maxTime || "No limit"}
                    </span>
                    </div>

                </div>
                </div>

            </div>
            )}


           {/* =====================================================
                DATE & TIME VALIDATION
            ====================================================== */}

            {form.validationType === "datetime" && (
            <div className="space-y-4">

                <div>
                <label className={labelClass}>
                    Date & Time Format
                </label>

                <select
                    value={
                    form.dateTimeFormat ||
                    "YYYY-MM-DD HH:mm"
                    }
                    onChange={(e) =>
                    updateField(
                        "dateTimeFormat",
                        e.target.value
                    )
                    }
                    className={inputClass}
                >
                    <option value="YYYY-MM-DD HH:mm">
                    YYYY-MM-DD HH:mm
                    </option>

                    <option value="DD-MM-YYYY HH:mm">
                    DD-MM-YYYY HH:mm
                    </option>

                    <option value="MM-DD-YYYY HH:mm">
                    MM-DD-YYYY HH:mm
                    </option>

                    <option value="DD/MM/YYYY HH:mm">
                    DD/MM/YYYY HH:mm
                    </option>

                    <option value="MM/DD/YYYY HH:mm">
                    MM/DD/YYYY HH:mm
                    </option>
                </select>

                <p className="mt-2 text-[11px] text-slate-400">
                    Example: 2026-10-07 14:30
                </p>
                </div>

                <div className="grid grid-cols-2 gap-3">

                <div>
                    <label className={labelClass}>
                    Minimum Date & Time
                    </label>

                    <input
                    type="datetime-local"
                    value={form.minDateTime || ""}
                    onChange={(e) =>
                        updateField(
                        "minDateTime",
                        e.target.value
                        )
                    }
                    className={inputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>
                    Maximum Date & Time
                    </label>

                    <input
                    type="datetime-local"
                    value={form.maxDateTime || ""}
                    onChange={(e) =>
                        updateField(
                        "maxDateTime",
                        e.target.value
                        )
                    }
                    className={inputClass}
                    />
                </div>

                </div>

            </div>
            )}


              {/* =====================================================
                CITY VALIDATION
            ====================================================== */}

            {form.validationType === "city" && (
            <div className="space-y-4">

                <div>
                <label className={labelClass}>
                    City Validation
                </label>

                <select
                    value={form.cityValidation || "any"}
                    onChange={(e) =>
                    updateField(
                        "cityValidation",
                        e.target.value
                    )
                    }
                    className={inputClass}
                >
                    <option value="any">
                    Any City
                    </option>

                    <option value="india">
                    Indian City
                    </option>
                </select>
                </div>

                {/* =====================================================
                    INDIAN CITY
                ====================================================== */}

                {form.cityValidation === "india" && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">

                    <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                    Indian City Validation
                    </p>

                    <p className="mt-2 text-xs text-slate-600">
                    Customer must enter a valid Indian city.
                    </p>

                    <p className="mt-2 text-[11px] text-slate-500">
                    Examples: Delhi, Mumbai, Jaipur, Pune,
                    Bengaluru, Hyderabad, Chennai
                    </p>

                </div>
                )}

                {/* =====================================================
                    ANY CITY
                ====================================================== */}

                {form.cityValidation === "any" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Any City Validation
                    </p>

                    <p className="mt-2 text-xs text-slate-600">
                    Customer can enter any valid city name.
                    </p>

                    <p className="mt-2 text-[11px] text-slate-500">
                    Examples: Delhi, London, Dubai, New York
                    </p>

                </div>
                )}

            </div>
            )}


          {/* REGEX */}

          {form.validationType ===
            "regex" && (
            <div>
              <label className={labelClass}>
                Custom Regex
              </label>

              <input
                type="text"
                value={form.regex}
                onChange={(e) =>
                  updateField(
                    "regex",
                    e.target.value
                  )
                }
                placeholder="^[A-Za-z ]+$"
                className={inputClass}
              />

              <p className="mt-2 text-[11px] text-slate-400">
                Example:
                <span className="ml-1 font-mono">
                  ^[A-Za-z ]+$
                </span>
              </p>
            </div>
          )}

          {/* CONFIG PREVIEW */}

          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-600">
              User Input Configuration
            </p>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">
                  Variable
                </span>

                <span className="font-bold text-slate-700">
                  {form.variable ||
                    "customer_input"}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">
                  Required
                </span>

                <span
                  className={
                    form.required
                      ? "font-bold text-green-600"
                      : "font-bold text-slate-500"
                  }
                >
                  {form.required
                    ? "Yes"
                    : "No"}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">
                  Skip
                </span>

                <span
                  className={
                    form.allowSkip
                      ? "font-bold text-cyan-600"
                      : "font-bold text-slate-500"
                  }
                >
                  {form.allowSkip
                    ? `Allowed (${
                        form.skipText ||
                        "skip"
                      })`
                    : "Not Allowed"}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">
                  Validation
                </span>

                <span className="font-bold uppercase text-slate-700">
                  {form.validationType ||
                    "text"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}




{node?.type === "api" && (
  <>
    {/* =====================================================
        API TITLE
    ====================================================== */}

    <div>
      <label className={labelClass}>
        API Name
      </label>

      <input
        type="text"
        value={form.apiName || ""}
        onChange={(e) =>
          updateField("apiName", e.target.value)
        }
        placeholder="Check Customer / Check Order / Verify API"
        className={inputClass}
      />
    </div>


    {/* =====================================================
        NORMAL API CONFIGURATION
        HIDDEN WHEN OTP IS ENABLED
    ====================================================== */}

    {!form.otpEnabled && (
      <>
        {/* =================================================
            API URL
        ================================================== */}

        <div className="mt-5">
          <label className={labelClass}>
            API URL
          </label>

          <input
            type="url"
            value={form.apiUrl || ""}
            onChange={(e) =>
              updateField("apiUrl", e.target.value)
            }
            placeholder="https://api.example.com/customer"
            className={inputClass}
          />

          <p className="mt-2 text-[11px] text-slate-400">
            Dynamic variables are supported.
            Example: ?mobile={"{{mobile}}"}
          </p>
        </div>


        {/* =================================================
            REQUEST METHOD
        ================================================== */}

        <div className="mt-4">
          <label className={labelClass}>
            Request Method
          </label>

          <select
            value={form.apiMethod || "GET"}
            onChange={(e) =>
              updateField("apiMethod", e.target.value)
            }
            className={inputClass}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </>
    )}


    {/* =====================================================
        AUTHENTICATION
    ====================================================== */}

    <div className="mt-5 border-t border-slate-100 pt-5">

      <div className="mb-4">
        <p className="text-sm font-bold text-indigo-700">
          Authentication
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          Optional authentication for the API request.
        </p>
      </div>


      <div>
        <label className={labelClass}>
          Authentication Type
        </label>

        <select
          value={form.apiAuthType || "none"}
          onChange={(e) =>
            updateField(
              "apiAuthType",
              e.target.value
            )
          }
          className={inputClass}
        >
          <option value="none">
            None
          </option>

          <option value="bearer">
            Bearer Token
          </option>

          <option value="api_key">
            API Key
          </option>

          <option value="basic">
            Basic Auth
          </option>
        </select>
      </div>


      {/* =================================================
          BEARER TOKEN
      ================================================== */}

      {form.apiAuthType === "bearer" && (
        <div className="mt-4">

          <label className={labelClass}>
            Bearer Token
          </label>

          <input
            type="text"
            value={form.apiBearerToken || ""}
            onChange={(e) =>
              updateField(
                "apiBearerToken",
                e.target.value
              )
            }
            placeholder="your-bearer-token or {{token}}"
            className={inputClass}
          />

        </div>
      )}


      {/* =================================================
          API KEY
      ================================================== */}

      {form.apiAuthType === "api_key" && (
        <>
          <div className="mt-4">

            <label className={labelClass}>
              API Key Header
            </label>

            <input
              type="text"
              value={form.apiKeyName || ""}
              onChange={(e) =>
                updateField(
                  "apiKeyName",
                  e.target.value
                )
              }
              placeholder="X-API-Key"
              className={inputClass}
            />

          </div>


          <div className="mt-4">

            <label className={labelClass}>
              API Key Value
            </label>

            <input
              type="text"
              value={form.apiKeyValue || ""}
              onChange={(e) =>
                updateField(
                  "apiKeyValue",
                  e.target.value
                )
              }
              placeholder="your-api-key or {{api_key}}"
              className={inputClass}
            />

          </div>
        </>
      )}


      {/* =================================================
          BASIC AUTH
      ================================================== */}

      {form.apiAuthType === "basic" && (
        <>
          <div className="mt-4">

            <label className={labelClass}>
              Username
            </label>

            <input
              type="text"
              value={form.apiUsername || ""}
              onChange={(e) =>
                updateField(
                  "apiUsername",
                  e.target.value
                )
              }
              placeholder="username"
              className={inputClass}
            />

          </div>


          <div className="mt-4">

            <label className={labelClass}>
              Password
            </label>

            <input
              type="password"
              value={form.apiPassword || ""}
              onChange={(e) =>
                updateField(
                  "apiPassword",
                  e.target.value
                )
              }
              placeholder="password"
              className={inputClass}
            />

          </div>
        </>
      )}

    </div>


    {/* =====================================================
        REQUEST HEADERS
    ====================================================== */}

    <div className="mt-5 border-t border-slate-100 pt-5">

      <div className="mb-4">
        <p className="text-sm font-bold text-indigo-700">
          Request Headers
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          Enter headers as JSON.
        </p>
      </div>

      <textarea
        value={form.apiHeaders || ""}
        onChange={(e) =>
          updateField(
            "apiHeaders",
            e.target.value
          )
        }
        rows={6}
        placeholder={`{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-Source": "whatsapp"
}`}
        className={`${textareaClass} font-mono text-xs`}
      />

      <p className="mt-2 text-[11px] text-slate-400">
        Header values can contain variables like {"{{token}}"}.
      </p>

    </div>


    {/* =====================================================
        QUERY PARAMETERS
    ====================================================== */}

    <div className="mt-5 border-t border-slate-100 pt-5">

      <div className="mb-4">
        <p className="text-sm font-bold text-indigo-700">
          Query Parameters
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          Optional URL query parameters.
        </p>
      </div>

      <textarea
        value={form.apiQuery || ""}
        onChange={(e) =>
          updateField(
            "apiQuery",
            e.target.value
          )
        }
        rows={6}
        placeholder={`{
  "mobile": "{{mobile}}",
  "source": "whatsapp",
  "channel": "bot"
}`}
        className={`${textareaClass} font-mono text-xs`}
      />

      <p className="mt-2 text-[11px] text-slate-400">
        Example:
        {" "}
        <code>https://example.com/api?mobile=9999999999</code>
      </p>

    </div>


    {/* =====================================================
        REQUEST PAYLOAD
        HIDDEN FOR GET / DELETE
    ====================================================== */}

    {!form.otpEnabled &&
      (form.apiMethod || "GET") !== "GET" &&
      (form.apiMethod || "GET") !== "DELETE" && (

        <div className="mt-5 border-t border-slate-100 pt-5">

          <div className="mb-4">

            <p className="text-sm font-bold text-indigo-700">
              Request Payload
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              Send any payload format supported by the API.
            </p>

          </div>


          {/* =================================================
              PAYLOAD TYPE
          ================================================== */}

          <div>

            <label className={labelClass}>
              Payload Type
            </label>

            <select
              value={form.apiBodyType || "json"}
              onChange={(e) =>
                updateField(
                  "apiBodyType",
                  e.target.value
                )
              }
              className={inputClass}
            >

              <option value="json">
                JSON
              </option>

              <option value="form">
                Form Data
              </option>

              <option value="raw">
                Raw Text
              </option>

              <option value="xml">
                XML
              </option>

            </select>

          </div>


          {/* =================================================
              CONTENT TYPE
          ================================================== */}

          <div className="mt-4">

            <label className={labelClass}>
              Content-Type
            </label>

            <select
              value={
                form.apiContentType ||
                (
                  form.apiBodyType === "form"
                    ? "application/x-www-form-urlencoded"
                    : form.apiBodyType === "xml"
                      ? "application/xml"
                      : form.apiBodyType === "raw"
                        ? "text/plain"
                        : "application/json"
                )
              }
              onChange={(e) =>
                updateField(
                  "apiContentType",
                  e.target.value
                )
              }
              className={inputClass}
            >

              <option value="application/json">
                application/json
              </option>

              <option value="application/x-www-form-urlencoded">
                application/x-www-form-urlencoded
              </option>

              <option value="multipart/form-data">
                multipart/form-data
              </option>

              <option value="application/xml">
                application/xml
              </option>

              <option value="text/xml">
                text/xml
              </option>

              <option value="text/plain">
                text/plain
              </option>

            </select>

          </div>


          {/* =================================================
              JSON
          ================================================== */}

          {(form.apiBodyType || "json") === "json" && (

            <div className="mt-4">

              <label className={labelClass}>
                JSON Payload
              </label>

              <textarea
                value={form.apiBody || ""}
                onChange={(e) =>
                  updateField(
                    "apiBody",
                    e.target.value
                  )
                }
                rows={12}
                placeholder={`{
                "mobile": "{{mobile}}",
                "name": "{{name}}",
                "email": "{{email}}",
                "order_id": "{{order_id}}",
                "source": "whatsapp"
              }`}
                className={`${textareaClass} font-mono text-xs`}
              />

              <p className="mt-2 text-[11px] text-slate-400">
                Supports nested JSON and dynamic variables.
              </p>

            </div>
          )}


          {/* =================================================
              FORM DATA
          ================================================== */}

          {form.apiBodyType === "form" && (

            <div className="mt-4">

              <label className={labelClass}>
                Form Data
              </label>

              <textarea
                value={form.apiFormData || ""}
                onChange={(e) =>
                  updateField(
                    "apiFormData",
                    e.target.value
                  )
                }
                rows={12}
                placeholder={`{
                  "mobile": "{{mobile}}",
                  "name": "{{name}}",
                  "email": "{{email}}",
                  "order_id": "{{order_id}}"
                }`}
                className={`${textareaClass} font-mono text-xs`}
              />

              <p className="mt-2 text-[11px] text-slate-400">
                Backend will send these values as form fields.
              </p>

            </div>
          )}


          {/* =================================================
              RAW TEXT
          ================================================== */}

          {form.apiBodyType === "raw" && (

            <div className="mt-4">

              <label className={labelClass}>
                Raw Payload
              </label>

              <textarea
                value={form.apiBody || ""}
                onChange={(e) =>
                  updateField(
                    "apiBody",
                    e.target.value
                  )
                }
                rows={12}
                placeholder={`mobile={{mobile}}
name={{name}}
order_id={{order_id}}`}
                className={`${textareaClass} font-mono text-xs`}
              />

              <p className="mt-2 text-[11px] text-slate-400">
                Raw content will be sent without JSON conversion.
              </p>

            </div>
          )}


          {/* =================================================
              XML
          ================================================== */}

          {form.apiBodyType === "xml" && (

            <div className="mt-4">

              <label className={labelClass}>
                XML Payload
              </label>

              <textarea
                value={form.apiBody || ""}
                onChange={(e) =>
                  updateField(
                    "apiBody",
                    e.target.value
                  )
                }
                rows={14}
                placeholder={`<?xml version="1.0" encoding="UTF-8"?>
                <request>
                    <mobile>{{mobile}}</mobile>
                    <name>{{name}}</name>
                    <order_id>{{order_id}}</order_id>
                </request>`}
                className={`${textareaClass} font-mono text-xs`}
              />

              <p className="mt-2 text-[11px] text-slate-400">
                XML variables will be resolved before sending.
              </p>

            </div>
          )}


          {/* =================================================
              PAYLOAD HELP
          ================================================== */}

          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">

            <p className="text-xs font-bold text-indigo-700">
              Dynamic Variables
            </p>

            <div className="mt-2 flex flex-wrap gap-2">

              {[
                "mobile",
                "name",
                "email",
                "order_id",
                "otp",
                "token",
                "api_response"
              ].map((variable) => (
                <code
                  key={variable}
                  className="rounded bg-white px-2 py-1 text-[10px] text-indigo-700"
                >
                  {`{{${variable}}}`}
                </code>
              ))}

            </div>

          </div>

        </div>
      )}


    {/* =====================================================
        OTP VERIFICATION
    ====================================================== */}

    <div className="mt-5 border-t border-slate-100 pt-5">

      <div className="mb-4">

        <p className="text-sm font-bold text-violet-700">
          OTP Verification
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          Enable this when the API node should perform OTP verification.
        </p>

      </div>


      {/* =================================================
          ENABLE OTP
      ================================================== */}

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">

        <input
          type="checkbox"
          checked={!!form.otpEnabled}
          onChange={(e) =>
            updateField(
              "otpEnabled",
              e.target.checked
            )
          }
          className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />

        <div>

          <p className="text-sm font-semibold text-slate-700">
            Enable OTP Verification
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Generate OTP → Send OTP → Verify OTP → Continue
          </p>

        </div>

      </label>


      {/* =================================================
          OTP CONFIG
      ================================================== */}

      {form.otpEnabled && (

        <div className="mt-4 space-y-5 rounded-xl border border-violet-200 bg-violet-50/40 p-4">


          {/* =================================================
              OTP API
          ================================================== */}

          <div className="rounded-xl border border-slate-200 bg-white p-4">

            <div className="mb-4">

              <p className="text-sm font-bold text-violet-700">
                OTP API Configuration
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                This API is used to send the generated OTP.
              </p>

            </div>


            {/* OTP URL */}

            <div>

              <label className={labelClass}>
                OTP API URL
              </label>

              <input
                type="url"
                value={form.otpUrl || ""}
                onChange={(e) =>
                  updateField(
                    "otpUrl",
                    e.target.value
                  )
                }
                placeholder="https://example.com/api/send-otp"
                className={inputClass}
              />

            </div>


            {/* OTP METHOD */}

            <div className="mt-4">

              <label className={labelClass}>
                OTP API Method
              </label>

              <select
                value={form.otpMethod || "POST"}
                onChange={(e) =>
                  updateField(
                    "otpMethod",
                    e.target.value
                  )
                }
                className={inputClass}
              >

                <option value="GET">
                  GET
                </option>

                <option value="POST">
                  POST
                </option>

                <option value="PUT">
                  PUT
                </option>

                <option value="PATCH">
                  PATCH
                </option>

              </select>

            </div>


            {/* OTP HEADERS */}

            <div className="mt-4">

              <label className={labelClass}>
                OTP API Headers
              </label>

              <textarea
                value={form.otpHeaders || ""}
                onChange={(e) =>
                  updateField(
                    "otpHeaders",
                    e.target.value
                  )
                }
                rows={6}
                placeholder={`{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{token}}"
}`}
                className={`${textareaClass} font-mono text-xs`}
              />

            </div>


            {/* OTP QUERY */}

            <div className="mt-4">

              <label className={labelClass}>
                OTP Query Parameters
              </label>

              <textarea
                value={form.otpQuery || ""}
                onChange={(e) =>
                  updateField(
                    "otpQuery",
                    e.target.value
                  )
                }
                rows={5}
                placeholder={`{
                  "source": "whatsapp"
                }`}
                className={`${textareaClass} font-mono text-xs`}
              />

            </div>

          </div>


          {/* =================================================
              OTP VARIABLES
          ================================================== */}

          <div className="rounded-xl border border-slate-200 bg-white p-4">

            <div className="mb-4">

              <p className="text-sm font-bold text-violet-700">
                OTP Variables
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                Configure the variable names used by the OTP flow.
              </p>

            </div>


            {/* MOBILE */}

            <div>

              <label className={labelClass}>
                Mobile Variable
              </label>

              <input
                type="text"
                value={form.mobileVariable || "mobile"}
                onChange={(e) =>
                  updateField(
                    "mobileVariable",
                    e.target.value
                  )
                }
                placeholder="mobile"
                className={inputClass}
              />

              <p className="mt-1 text-[11px] text-slate-400">
                Example: mobile, phone, customer_mobile
              </p>

            </div>


            {/* NAME */}

            <div className="mt-4">

              <label className={labelClass}>
                Name Variable
              </label>

              <input
                type="text"
                value={form.nameVariable || "name"}
                onChange={(e) =>
                  updateField(
                    "nameVariable",
                    e.target.value
                  )
                }
                placeholder="name"
                className={inputClass}
              />

            </div>


            {/* OTP */}

            <div className="mt-4">

              <label className={labelClass}>
                OTP Variable
              </label>

              <input
                type="text"
                value={form.otpVariable || "otp"}
                onChange={(e) =>
                  updateField(
                    "otpVariable",
                    e.target.value
                  )
                }
                placeholder="otp"
                className={inputClass}
              />

            </div>


            {/* REFERENCE */}

            <div className="mt-4">

              <label className={labelClass}>
                Reference Variable
              </label>

              <input
                type="text"
                value={
                  form.referenceVariable ||
                  "otp_reference"
                }
                onChange={(e) =>
                  updateField(
                    "referenceVariable",
                    e.target.value
                  )
                }
                placeholder="otp_reference"
                className={inputClass}
              />

            </div>


            {/* VERIFIED */}

            <div className="mt-4">

              <label className={labelClass}>
                Verified Variable
              </label>

              <input
                type="text"
                value={
                  form.otpVerifiedVariable ||
                  "otp_verified"
                }
                onChange={(e) =>
                  updateField(
                    "otpVerifiedVariable",
                    e.target.value
                  )
                }
                placeholder="otp_verified"
                className={inputClass}
              />

            </div>

          </div>


          {/* =================================================
              OTP SETTINGS
          ================================================== */}

          <div className="rounded-xl border border-slate-200 bg-white p-4">

            <div className="mb-4">

              <p className="text-sm font-bold text-violet-700">
                OTP Settings
              </p>

            </div>


            <div className="grid grid-cols-2 gap-3">

              {/* LENGTH */}

              <div>

                <label className={labelClass}>
                  OTP Length
                </label>

                <input
                  type="number"
                  min="4"
                  max="8"
                  value={form.otpLength ?? 6}
                  onChange={(e) =>
                    updateField(
                      "otpLength",
                      Number(e.target.value)
                    )
                  }
                  className={inputClass}
                />

              </div>


              {/* EXPIRY */}

              <div>

                <label className={labelClass}>
                  Expiry Minutes
                </label>

                <input
                  type="number"
                  min="1"
                  max="60"
                  value={form.expiryMinutes ?? 5}
                  onChange={(e) =>
                    updateField(
                      "expiryMinutes",
                      Number(e.target.value)
                    )
                  }
                  className={inputClass}
                />

              </div>

            </div>


            {/* MAX ATTEMPTS */}

            <div className="mt-4">

              <label className={labelClass}>
                Maximum Attempts
              </label>

              <input
                type="number"
                min="1"
                max="10"
                value={form.maxAttempts ?? 3}
                onChange={(e) =>
                  updateField(
                    "maxAttempts",
                    Number(e.target.value)
                  )
                }
                className={inputClass}
              />

            </div>


            {/* OTP MESSAGE */}

            <div className="mt-4">

              <label className={labelClass}>
                OTP Message
              </label>

              <textarea
                value={
                  form.otpMessage ||
                  "Your OTP has been sent. Please enter the OTP."
                }
                onChange={(e) =>
                  updateField(
                    "otpMessage",
                    e.target.value
                  )
                }
                rows={3}
                className={textareaClass}
              />

            </div>

          </div>


          {/* =================================================
              OTP SMS PAYLOAD
          ================================================== */}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

            <p className="text-xs font-bold text-amber-700">
              OTP SMS Payload
            </p>

            <p className="mt-1 text-[11px] text-amber-700/70">
              Payload sent to your SMS/OTP provider.
            </p>

            <textarea
              value={form.otpPayload || ""}
              onChange={(e) =>
                updateField(
                  "otpPayload",
                  e.target.value
                )
              }
              rows={16}
              placeholder={`{
  "mobile": "{{mobile}}",
  "name": "{{name}}",
  "otp": "{{otp}}"
}`}
              className="mt-3 w-full rounded-lg border border-amber-300 bg-white px-3 py-3 font-mono text-xs text-slate-700"
            />

            <p className="mt-2 text-[11px] text-amber-700/70">
              Variables supported:
              {" "}
              {"{{mobile}}"}
              {" "}
              {"{{name}}"}
              {" "}
              {"{{otp}}"}
            </p>

          </div>


          {/* =================================================
              OTP FLOW
          ================================================== */}

          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">

            <p className="text-xs font-bold text-violet-700">
              OTP Flow
            </p>

            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              1. Generate OTP.
              <br />
              2. Send OTP through configured API.
              <br />
              3. Customer receives OTP.
              <br />
              4. Customer enters OTP on WhatsApp.
              <br />
              5. Backend verifies OTP.
              <br />
              6. Correct OTP → Continue.
              <br />
              7. Wrong OTP → Retry.
              <br />
              8. Maximum attempts → Failure.
            </p>

          </div>

        </div>
      )}

    </div>


    {/* =====================================================
        API RESPONSE
        HIDDEN WHEN OTP
    ====================================================== */}

    {!form.otpEnabled && (

      <div className="mt-5 border-t border-slate-100 pt-5">

        <div className="mb-4">

          <p className="text-sm font-bold text-indigo-700">
            API Response
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Store the complete API response for later nodes.
          </p>

        </div>


        {/* RESPONSE VARIABLE */}

        <div>

          <label className={labelClass}>
            Response Variable
          </label>

          <input
            type="text"
            value={
              form.apiResponseVariable ||
              "api_response"
            }
            onChange={(e) =>
              updateField(
                "apiResponseVariable",
                e.target.value
              )
            }
            placeholder="api_response"
            className={inputClass}
          />

        </div>


        {/* RESPONSE PATH */}

        <div className="mt-4">

          <label className={labelClass}>
            Response Path
          </label>

          <input
            type="text"
            value={form.apiResponsePath || ""}
            onChange={(e) =>
              updateField(
                "apiResponsePath",
                e.target.value
              )
            }
            placeholder="data.status"
            className={inputClass}
          />

          <p className="mt-2 text-[11px] text-slate-400">
            Examples:
            {" "}
            data.status
            {" · "}
            success
            {" · "}
            result.verified
          </p>

        </div>

      </div>
    )}




    {!form.otpEnabled && (

      <div className="mt-5 border-t border-slate-100 pt-5">

        <div className="mb-4">

          <p className="text-sm font-bold text-emerald-700">
            Confirmation / Success Condition
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Decide whether the API request succeeded.
          </p>

        </div>


        {/* CONDITION TYPE */}

        <div>

          <label className={labelClass}>
            Condition Type
          </label>

          <select
            value={
              form.apiSuccessType ||
              "status"
            }
            onChange={(e) =>
              updateField(
                "apiSuccessType",
                e.target.value
              )
            }
            className={inputClass}
          >

            <option value="status">
              HTTP Status Code
            </option>

            <option value="response">
              Response Value
            </option>

            <option value="boolean">
              Boolean Response
            </option>

          </select>

        </div>


        {/* HTTP STATUS */}

        {(
          form.apiSuccessType ||
          "status"
        ) === "status" && (

          <div className="mt-4">

            <label className={labelClass}>
              Success Status Codes
            </label>

            <input
              type="text"
              value={
                form.apiSuccessStatus ||
                "200,201"
              }
              onChange={(e) =>
                updateField(
                  "apiSuccessStatus",
                  e.target.value
                )
              }
              placeholder="200,201"
              className={inputClass}
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Example: 200,201,202
            </p>

          </div>
        )}


        {/* RESPONSE VALUE */}

        {form.apiSuccessType === "response" && (

          <>

            <div className="mt-4">

              <label className={labelClass}>
                Response Field
              </label>

              <input
                type="text"
                value={
                  form.apiSuccessField ||
                  ""
                }
                onChange={(e) =>
                  updateField(
                    "apiSuccessField",
                    e.target.value
                  )
                }
                placeholder="data.status"
                className={inputClass}
              />

            </div>


            <div className="mt-4">

              <label className={labelClass}>
                Expected Value
              </label>

              <input
                type="text"
                value={
                  form.apiSuccessValue ||
                  ""
                }
                onChange={(e) =>
                  updateField(
                    "apiSuccessValue",
                    e.target.value
                  )
                }
                placeholder="success"
                className={inputClass}
              />

            </div>

          </>
        )}


        {/* BOOLEAN */}

        {form.apiSuccessType === "boolean" && (

          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">

            <p className="text-[11px] leading-5 text-slate-500">
              Boolean API responses such as
              {" "}
              <code>true</code>
              {" "}
              or
              {" "}
              <code>false</code>
              {" "}
              are supported.
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              If the response is an object, the backend will also
              check common boolean fields such as success,
              verified and status.
            </p>

          </div>
        )}


        {/* SUCCESS MESSAGE */}

        <div className="mt-4">

          <label className={labelClass}>
            Success Message
          </label>

          <textarea
            value={
              form.apiSuccessMessage ||
              ""
            }
            onChange={(e) =>
              updateField(
                "apiSuccessMessage",
                e.target.value
              )
            }
            rows={3}
            placeholder="Request completed successfully."
            className={textareaClass}
          />

        </div>


        {/* FAILURE MESSAGE */}

        <div className="mt-4">

          <label className={labelClass}>
            Failure Message
          </label>

          <textarea
            value={
              form.apiFailureMessage ||
              ""
            }
            onChange={(e) =>
              updateField(
                "apiFailureMessage",
                e.target.value
              )
            }
            rows={3}
            placeholder="Unable to process the request."
            className={textareaClass}
          />

        </div>

      </div>
    )}


    {/* =====================================================
        TIMEOUT
    ====================================================== */}

    <div className="mt-5 border-t border-slate-100 pt-5">

      <label className={labelClass}>
        API Timeout
      </label>

      <div className="flex items-center gap-2">

        <input
          type="number"
          min="1"
          max="120"
          value={form.apiTimeout ?? 30}
          onChange={(e) =>
            updateField(
              "apiTimeout",
              Number(e.target.value)
            )
          }
          className={inputClass}
        />

        <span className="text-xs font-semibold text-slate-500">
          seconds
        </span>

      </div>

    </div>


    {/* =====================================================
        PREVIEW
    ====================================================== */}

    <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4">

      <div className="flex items-center gap-2">

        <span className="text-lg">
          🔌
        </span>

        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
          API Configuration
        </p>

      </div>


      <div className="mt-3 space-y-2 text-xs">

        {/* NAME */}

        <div className="flex justify-between gap-3">

          <span className="text-slate-500">
            Name
          </span>

          <span className="max-w-[60%] truncate font-bold text-slate-700">
            {form.apiName || "Unnamed API"}
          </span>

        </div>


        {/* METHOD */}

        <div className="flex justify-between gap-3">

          <span className="text-slate-500">
            Method
          </span>

          <span className="font-bold text-slate-700">
            {form.otpEnabled
              ? form.otpMethod || "POST"
              : form.apiMethod || "GET"}
          </span>

        </div>


        {/* URL */}

        <div className="flex justify-between gap-3">

          <span className="text-slate-500">
            URL
          </span>

          <span className="max-w-[60%] truncate font-bold text-slate-700">

            {form.otpEnabled
              ? form.otpUrl || "Not configured"
              : form.apiUrl || "Not configured"}

          </span>

        </div>


        {/* AUTH */}

        <div className="flex justify-between gap-3">

          <span className="text-slate-500">
            Auth
          </span>

          <span className="font-bold text-slate-700">
            {form.apiAuthType || "none"}
          </span>

        </div>


        {/* PAYLOAD */}

        {!form.otpEnabled && (
          <div className="flex justify-between gap-3">

            <span className="text-slate-500">
              Payload
            </span>

            <span className="font-bold text-slate-700">
              {form.apiBodyType || "json"}
            </span>

          </div>
        )}


        {/* CONTENT TYPE */}

        {!form.otpEnabled && (
          <div className="flex justify-between gap-3">

            <span className="text-slate-500">
              Content-Type
            </span>

            <span className="max-w-[60%] truncate text-right font-bold text-slate-700">
              {form.apiContentType ||
                (
                  form.apiBodyType === "form"
                    ? "application/x-www-form-urlencoded"
                    : form.apiBodyType === "xml"
                      ? "application/xml"
                      : form.apiBodyType === "raw"
                        ? "text/plain"
                        : "application/json"
                )}
            </span>

          </div>
        )}


        {/* OTP */}

        <div className="flex justify-between gap-3">

          <span className="text-slate-500">
            OTP
          </span>

          <span
            className={`font-bold ${
              form.otpEnabled
                ? "text-violet-600"
                : "text-slate-400"
            }`}
          >
            {form.otpEnabled
              ? "Enabled"
              : "Disabled"}
          </span>

        </div>


        {/* OTP DETAILS */}

        {form.otpEnabled && (
          <>

            <div className="flex justify-between gap-3">

              <span className="text-slate-500">
                Mobile
              </span>

              <span className="font-bold text-slate-700">
                {form.mobileVariable || "mobile"}
              </span>

            </div>


            <div className="flex justify-between gap-3">

              <span className="text-slate-500">
                Name
              </span>

              <span className="font-bold text-slate-700">
                {form.nameVariable || "name"}
              </span>

            </div>


            <div className="flex justify-between gap-3">

              <span className="text-slate-500">
                OTP Length
              </span>

              <span className="font-bold text-slate-700">
                {form.otpLength ?? 6}
              </span>

            </div>


            <div className="flex justify-between gap-3">

              <span className="text-slate-500">
                Expiry
              </span>

              <span className="font-bold text-slate-700">
                {form.expiryMinutes ?? 5} min
              </span>

            </div>


            <div className="flex justify-between gap-3">

              <span className="text-slate-500">
                Attempts
              </span>

              <span className="font-bold text-slate-700">
                {form.maxAttempts ?? 3}
              </span>

            </div>

          </>
        )}


        {/* SUCCESS */}

        {!form.otpEnabled && (

          <div className="flex justify-between gap-3">

            <span className="text-slate-500">
              Success
            </span>

            <span className="max-w-[60%] truncate text-right font-bold text-emerald-600">

              {form.apiSuccessType === "response"
                ? `${form.apiSuccessField || "field"} = ${
                    form.apiSuccessValue || "value"
                  }`
                : form.apiSuccessType === "boolean"
                  ? "Boolean"
                  : form.apiSuccessStatus ||
                    "200,201"}

            </span>

          </div>
        )}


        {/* RESPONSE */}

        {!form.otpEnabled && (

          <div className="flex justify-between gap-3">

            <span className="text-slate-500">
              Response
            </span>

            <span className="font-bold text-slate-700">
              {form.apiResponseVariable ||
                "api_response"}
            </span>

          </div>
        )}

      </div>

    </div>

  </>
)}


{/* =====================================================
    NORMAL MEDIA NODE
====================================================== */}
{node?.type === "media" && (
  <>
    {/* =================================================
        MEDIA TYPE
    ================================================== */}

    <div>
      <label className={labelClass}>
        Media Type
      </label>

      <select
        value={form.mediaType || "image"}
        onChange={(e) => {
          const type = e.target.value;

          updateField("mediaType", type);

          // Clear caption for audio
          if (type === "audio") {
            updateField("mediaBody", "");
          }
        }}
        className={inputClass}
      >
        <option value="image">Image</option>
        <option value="document">Document</option>
        <option value="video">Video</option>
        <option value="audio">Audio</option>
      </select>

      <p className="mt-2 text-[11px] text-slate-400">
        Select the type of media you want to send through WhatsApp.
      </p>
    </div>

    {/* =================================================
        MEDIA UPLOAD
    ================================================== */}

    <div>
      <label className={labelClass}>
        Upload Media
      </label>

      <div className="mt-2 rounded-xl border border-dashed border-fuchsia-300 bg-fuchsia-50/50 p-4">
        <label
          className={`
            flex cursor-pointer flex-col items-center justify-center
            rounded-xl border border-fuchsia-200 bg-white px-4 py-6
            text-center transition hover:border-fuchsia-400 hover:bg-fuchsia-50
            ${form.mediaUploading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          {form.mediaUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />

              <span className="mt-2 text-sm font-semibold text-fuchsia-700">
                Uploading...
              </span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-fuchsia-600" />

              <span className="mt-2 text-sm font-semibold text-slate-700">
                Upload Media
              </span>

              <span className="mt-1 text-[11px] text-slate-400">
                Image, Document, Audio or Video
              </span>
            </>
          )}

          <input
            type="file"
            className="hidden"
            disabled={form.mediaUploading}
            accept="
              image/*,
              application/pdf,
              application/msword,
              application/vnd.openxmlformats-officedocument.wordprocessingml.document,
              application/vnd.ms-excel,
              application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
              application/vnd.ms-powerpoint,
              application/vnd.openxmlformats-officedocument.presentationml.presentation,
              text/plain,
              text/csv,
              audio/*,
              video/*
            "
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                uploadMedia(file);
              }

              e.target.value = "";
            }}
          />
        </label>

        {/* =============================================
            UPLOADED MEDIA
        ============================================== */}

        {form.mediaUrl && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-3">
              {/* MEDIA ICON / THUMBNAIL */}

              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-fuchsia-50">
                {(
                  form.mediaMimeType === "image" ||
                  form.mediaMimeType?.startsWith("image/")
                ) ? (
                  <img
                    src={form.mediaUrl}
                    alt={form.mediaName || "Uploaded media"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (
                    form.mediaMimeType === "video" ||
                    form.mediaMimeType?.startsWith("video/")
                  ) ? (
                    <Video className="h-7 w-7 text-fuchsia-600" />
                  ) : (
                    (
                      form.mediaMimeType === "audio" ||
                      form.mediaMimeType?.startsWith("audio/")
                    ) ? (
                      <Volume2 className="h-7 w-7 text-fuchsia-600" />
                    ) : (
                      <FileText className="h-7 w-7 text-fuchsia-600" />
                    )
                  )
                )}
              </div>

              {/* FILE INFORMATION */}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {form.mediaName || "Uploaded Media"}
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  Type: {form.mediaMimeType || form.mediaType || "media"}
                </p>

                {form.mediaId && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    Media ID: {form.mediaId}
                  </p>
                )}

                <p className="mt-1 truncate text-[10px] text-slate-400">
                  {form.mediaUrl}
                </p>
              </div>

              {/* REMOVE MEDIA */}

              <button
                type="button"
                onClick={() => {
                  setForm((previous) => ({
                    ...previous,
                    mediaId: "",
                    mediaUrl: "",
                    mediaName: "",
                    mediaMimeType: "",
                    mediaFilename: "",
                    fileName: "",
                  }));
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                title="Remove media"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-slate-400">
        Maximum file size: 50 MB.
      </p>
    </div>

    {/* =================================================
        MEDIA URL
    ================================================== */}

    <div>
      <label className={labelClass}>
        Media URL
      </label>

      <input
        type="url"
        value={form.mediaUrl || ""}
        onChange={(e) => updateField("mediaUrl", e.target.value)}
        placeholder="https://example.com/media.jpg"
        className={inputClass}
      />

      <p className="mt-2 text-[11px] text-slate-400">
        Upload a file above or enter a public HTTPS URL manually.
      </p>
    </div>

    {/* =================================================
        DOCUMENT FILENAME
    ================================================== */}

    {form.mediaType === "document" && (
      <div>
        <label className={labelClass}>
          Filename
        </label>

        <input
          type="text"
          value={form.mediaFilename || form.fileName || ""}
          onChange={(e) => {
            updateField("mediaFilename", e.target.value);
            updateField("fileName", e.target.value);
          }}
          placeholder="Jaquar-Catalog.pdf"
          className={inputClass}
        />

        <p className="mt-2 text-[11px] text-slate-400">
          Filename shown to the WhatsApp user.
        </p>
      </div>
    )}

    {/* =================================================
        MEDIA CAPTION
        IMAGE / VIDEO / DOCUMENT
    ================================================== */}

    {(
      form.mediaType === "image" ||
      form.mediaType === "video" ||
      form.mediaType === "document"
    ) && (
      <div>
        <label className={labelClass}>
          Caption
        </label>

        <textarea
          value={form.mediaBody || ""}
          onChange={(e) => updateField("mediaBody", e.target.value)}
          rows={3}
          placeholder="Enter media caption..."
          className={textareaClass}
        />

        <p className="mt-2 text-[11px] text-slate-400">
          Optional caption sent with the media.
        </p>
      </div>
    )}

    {/* =================================================
        AUDIO INFORMATION
    ================================================== */}

    {form.mediaType === "audio" && (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Volume2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

          <div>
            <p className="text-xs font-bold text-amber-700">
              Audio Message
            </p>

            <p className="mt-1 text-[11px] leading-5 text-amber-700">
              Audio is sent as a normal WhatsApp audio message.
              Caption and interactive buttons are not configured for audio.
            </p>
          </div>
        </div>
      </div>
    )}

    {/* =================================================
        MEDIA PREVIEW
    ================================================== */}

    <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-fuchsia-600" />

        <p className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-600">
          Media Preview
        </p>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
        {/* IMAGE */}

        {form.mediaUrl && (
          form.mediaMimeType === "image" ||
          form.mediaMimeType?.startsWith("image/") ||
          form.mediaType === "image"
        ) ? (
          <img
            src={form.mediaUrl}
            alt={form.mediaName || "Media"}
            className="max-h-64 w-full object-contain"
          />
        ) : form.mediaUrl && (
          form.mediaMimeType === "video" ||
          form.mediaMimeType?.startsWith("video/") ||
          form.mediaType === "video"
        ) ? (
          /* VIDEO */

          <div className="bg-black p-2">
            <video
              src={form.mediaUrl}
              controls
              className="max-h-64 w-full rounded-lg"
            />
          </div>
        ) : form.mediaUrl && (
          form.mediaMimeType === "audio" ||
          form.mediaMimeType?.startsWith("audio/") ||
          form.mediaType === "audio"
        ) ? (
          /* AUDIO */

          <div className="flex flex-col items-center justify-center p-6">
            <Volume2 className="h-10 w-10 text-fuchsia-600" />

            <p className="mt-2 text-xs font-semibold text-slate-700">
              {form.mediaName || "Audio File"}
            </p>

            <audio
              src={form.mediaUrl}
              controls
              className="mt-3 w-full"
            />
          </div>
        ) : form.mediaUrl ? (
          /* DOCUMENT */

          <div className="flex flex-col items-center justify-center p-8">
            <FileText className="h-10 w-10 text-fuchsia-500" />

            <p className="mt-2 text-xs font-semibold text-slate-700">
              {form.mediaName ||
                form.mediaFilename ||
                form.fileName ||
                "Document"}
            </p>

            <a
              href={form.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 rounded-lg bg-fuchsia-100 px-3 py-2 text-[11px] font-bold text-fuchsia-700 hover:bg-fuchsia-200"
            >
              Open Media
            </a>
          </div>
        ) : (
          /* EMPTY PREVIEW */

          <div className="flex h-32 items-center justify-center bg-slate-100">
            <ImageIcon className="h-8 w-8 text-slate-300" />
          </div>
        )}
      </div>

      {/* CAPTION PREVIEW */}

      {form.mediaBody && form.mediaType !== "audio" && (
        <div className="mt-3 rounded-lg bg-white p-3">
          <p className="text-[10px] font-semibold uppercase text-slate-400">
            Caption
          </p>

          <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
            {form.mediaBody}
          </p>
        </div>
      )}
    </div>

    {/* =================================================
        MEDIA CONFIGURATION
    ================================================== */}

    <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-600">
        Media Configuration
      </p>

      <div className="mt-3 space-y-2 text-xs">
        {/* TYPE */}

        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Type</span>

          <span className="font-bold uppercase text-slate-700">
            {form.mediaType || "image"}
          </span>
        </div>

        {/* FILE */}

        <div className="flex justify-between gap-3">
          <span className="text-slate-500">File</span>

          <span className="max-w-[60%] truncate font-bold text-slate-700">
            {form.mediaName || "Not uploaded"}
          </span>
        </div>

        {/* MEDIA ID */}

        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Media ID</span>

          <span className="max-w-[60%] truncate font-bold text-slate-700">
            {form.mediaId || "—"}
          </span>
        </div>

        {/* CAPTION STATUS */}

        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Caption</span>

          <span className="font-bold text-slate-700">
            {form.mediaType === "audio"
              ? "Not available"
              : form.mediaBody?.trim()
                ? "Added"
                : "Optional"}
          </span>
        </div>
      </div>
    </div>
  </>
)}
     


      {/* =====================================================
          END
      ====================================================== */}

      {node?.type === "end" && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-700">
            End Node
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            This node finishes the
            workflow.
          </p>
        </div>
      )}

      {/* =====================================================
          ACTIONS
      ====================================================== */}

      <div className="border-t border-slate-100 pt-5">
<button
  type="button"
  onClick={update}
  className="
    flex
    w-full
    items-center
    justify-center
    gap-2
    rounded-xl
    bg-emerald-700
    px-5
    py-3.5
    text-sm
    font-bold
    text-white
    shadow-md
    shadow-emerald-500/20
    transition
    hover:bg-emerald-800 cursor-pointer
  "
>
  <Save className="h-4 w-4" />
  Apply Changes
</button>

        {node?.type !== "start" &&
          node?.type !== "end" && (
            <button
              type="button"
              onClick={onDelete}
              className="
                mt-3
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-5
                py-3.5
                text-sm
                font-bold
                text-red-600
                transition
                hover:bg-red-100
              "
            >
              <Trash2 className="h-4 w-4" />

              Delete Node
            </button>
          )}
      </div>
    </div>
  );
}

/* =========================================================
   APP
========================================================= */

const WorkflowBuilder = () => {

  const navigate = useNavigate();
  const location = useLocation();

const [showEmptyWorkflowOverlay, setShowEmptyWorkflowOverlay] =
  useState(false);

useEffect(() => {
  if (location.state?.showEmptyWorkflowOverlay) {
    setShowEmptyWorkflowOverlay(true);

    // Remove navigation state so refresh doesn't reopen the popup
    navigate(location.pathname, {
      replace: true,
      state: {},
    });
  }
}, [location.state, location.pathname, navigate]);


    const [saved, setSaved] = useState(false);

    const [showFirstWorkflowGuide, setShowFirstWorkflowGuide] =
  useState(false);
  useEffect(() => {
  if (location.state?.showCreateWorkflowGuide) {
    setShowFirstWorkflowGuide(true);

    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }
}, [location.state, location.pathname, navigate]);


    const [isLoadingWorkflowPage, setIsLoadingWorkflowPage] =
    useState(true);

     /* =======================================================
     AUTH
  ======================================================= */

  const [token, setToken] =
    useState(
      localStorage.getItem(
        "token"
      ) || ""
    );



  /* =======================================================
     WORKFLOW
  ======================================================= */

  const [
    workflowId,
    setWorkflowId,
  ] = useState(
    localStorage.getItem(
      "workflow_id"
    ) || null
  );

  const [name, setName] =
    useState(
      ""
    );

  const [
    workflows,
    setWorkflows,
  ] = useState([]);

  const [
    loadingWorkflows,
    setLoadingWorkflows,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

    /* =======================================================
   TENANT / BOT SELECTION
======================================================= */

const storedUser = (() => {
  try {
    return JSON.parse(
      localStorage.getItem("user") ||
      sessionStorage.getItem("user") ||
      "{}"
    );
  } catch {
    return {};
  }
})();

const isSuperAdmin = Boolean(
  storedUser?.is_super_admin ||
  storedUser?.role === "super_admin" ||
  storedUser?.role_name === "Super Admin"
);

const [tenants, setTenants] = useState([]);
const [bots, setBots] = useState([]);

const [selectedTenantId, setSelectedTenantId] = useState(() => {
  if (isSuperAdmin) {
    return localStorage.getItem("workflow_tenant_id") || "";
  }
  return storedUser?.tenant_id ? String(storedUser.tenant_id) : "";
});

const [selectedBotId, setSelectedBotId] = useState(
  localStorage.getItem("workflow_bot_id") || ""
);

const [loadingTenants, setLoadingTenants] = useState(false);
const [loadingBots, setLoadingBots] = useState(false);

const isPageLoading =
  isLoadingWorkflowPage ||
  loadingBots ||
  loadingWorkflows;


const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
const [workflowFormName, setWorkflowFormName] = useState("");
const [workflowFormDescription, setWorkflowFormDescription] = useState("");
const [workflowModalMode, setWorkflowModalMode] = useState("add");


  /* =======================================================
     REACT FLOW
  ======================================================= */

  const [
    nodes,
    setNodes,
    onNodesChange,
  ] = useNodesState([]);

  const [
    edges,
    setEdges,
    onEdgesChange,
  ] = useEdgesState([]);

  const [
    selected,
    setSelected,
  ] = useState(null);

  const reactFlowWrapper = useRef(null);

const [reactFlowInstance, setReactFlowInstance] =
  useState(null);


  const openUpdateWorkflowModal = () => {
  const workflow = workflows.find(
    (item) => String(item.id) === String(workflowId)
  );

  if (!workflow) {
    toast.error("Please select a workflow first.");
    return;
  }

  setWorkflowModalMode("update");
  setWorkflowFormName(workflow.name || "");
  setWorkflowFormDescription(workflow.description || "");
  setWorkflowModalOpen(true);
};


    /* =======================================================
     PUSH HISTORY
  ======================================================= */

  const pushHistory =
    useCallback(
      (
        snapshotNodes = nodes,
        snapshotEdges = edges
      ) => {
        if (
          !historyReady.current ||
          isUndoRedo.current ||
          isLoadingWorkflow.current
        ) {
          return;
        }

        setHistory(
          (current) => [
            ...current,
            {
              nodes:
                structuredClone(
                  snapshotNodes
                ),

              edges:
                structuredClone(
                  snapshotEdges
                ),
            },
          ]
        );

        setFuture([]);
      },
      [nodes, edges]
    );



  /* =======================================================
     HISTORY
  ======================================================= */

  const [
    history,
    setHistory,
  ] = useState([]);

  const [
    future,
    setFuture,
  ] = useState([]);

  const historyReady =
    useRef(false);

  const isUndoRedo =
    useRef(false);

  const isLoadingWorkflow =
    useRef(false);


/* =======================================================
   DRAG OVER
======================================================= */

const onDragOver = useCallback((event) => {
    event.preventDefault();

    event.dataTransfer.dropEffect = "move";
}, []);


const onDrop = useCallback(
    (event) => {
        event.preventDefault();

        if (!reactFlowInstance) {
            console.warn(
                "React Flow instance not ready."
            );

            return;
        }

        const type =
            event.dataTransfer.getData(
                "application/reactflow"
            );

        if (!type) {
            return;
        }

        const bounds =
            reactFlowWrapper.current?.getBoundingClientRect();

        if (!bounds) {
            return;
        }

        const position =
            reactFlowInstance.project({
                x:
                    event.clientX -
                    bounds.left,

                y:
                    event.clientY -
                    bounds.top,
            });

        /* =================================================
           MENU OPTIONS
        ================================================= */

        const menuOptions =
            type === "menu"
                ? defaultMenuOptions.map(
                      (option, index) => ({
                          id:
                              option.id ||
                              `option-${index + 1}`,

                          label:
                              option.label,
                      })
                  )
                : [];

        /* =================================================
           MEDIA TYPE
        ================================================= */

        const mediaType =
            type === "image"
                ? "image"
                : type === "video"
                ? "video"
                : type === "document"
                ? "document"
                : type === "pdf"
                ? "document"
                : type === "audio"
                ? "audio"
                : "";

        /* =================================================
           CREATE NEW NODE
        ================================================= */

        const newNode = {
            id:
                `${type}-${Date.now()}`,

            type,

            /* =============================================
               EXACT DROP POSITION
            ============================================== */

            position: {
                x: position.x,
                y: position.y,
            },

            data: {
                /* =============================================
                   BASIC
                ============================================== */

                label:
                    palette.find(
                        (item) =>
                            item[0] === type
                    )?.[1] || type,

               message:
                type === "message"
                    ? "Hello! Welcome."
                    : type === "button"
                    ? "Enter button message..."
                    : type === "menu"
                    ? "Please select an option:"
                    : type === "userInput"
                    ? "What is your name?"
                    : "",
                /* =============================================
                   USER INPUT
                ============================================== */

                variable:
                    type === "userInput"
                        ? "customer_name"
                        : "",

                required:
                    true,

                allowSkip:
                    false,

                skipText:
                    "skip",

                validationType:
                    "text",

                validationMessage:
                    "⚠️ Please enter a valid response.",

                requiredMessage:
                    "⚠️ This field is required. Please enter a valid response.",

                minLength: "",

                maxLength: "",

                minValue: "",

                maxValue: "",

                regex: "",

                /* =============================================
                   BUTTON
                ============================================== */

                buttonText:
                    type === "button"
                        ? "button text"
                        : "",

                    buttonValue:
                    type === "button"
                      ? "button_value"
                      : "",

                /* =============================================
                   MENU
                ============================================== */

                menuOptions,

                /* =============================================
                   CONDITION
                ============================================== */

                condition:
                    type === "condition"
                        ? "customer.points > 100"
                        : "",

                /* =============================================
                   API
                ============================================== */

                method: "GET",

                apiUrl: "",

                /* =============================================
                   MEDIA
                ============================================== */

                // image / video / document / pdf / audio
                mediaType,

                // Generic media URL
                mediaUrl: "",

                // Individual media URLs
                imageUrl: "",
                videoUrl: "",
                documentUrl: "",
                audioUrl: "",

                // File name for document/pdf
                fileName: "",

                // Media caption
                caption: "",

                /* =============================================
                   MEDIA TEMPLATE
                ============================================== */

                // Provider template name
                templateName:
                    type === "media_template"
                        ? ""
                        : "",

                // Provider template ID
                templateId:
                    type === "media_template"
                        ? ""
                        : "",

                // Template language
                templateLanguage:
                    type === "media_template"
                        ? "en"
                        : "",

                // Template body / caption
                templateBody:
                    type === "media_template"
                        ? ""
                        : "",

                // Template image URL
                templateImageUrl:
                    type === "media_template"
                        ? ""
                        : "",

                // Template variables
                templateVariables:
                    type === "media_template"
                        ? []
                        : [],

                /* =============================================
                   DELAY
                ============================================== */

                delay: "",

                delayUnit: "",
            },
        };

        /* =================================================
           HISTORY
        ================================================= */

        pushHistory(
            nodes,
            edges
        );

        /* =================================================
           ADD NODE
        ================================================= */

        setNodes(
            (currentNodes) => [
                ...currentNodes,
                newNode,
            ]
        );

        /* =================================================
           SELECT NEW NODE
        ================================================= */

        setSelected(
            newNode
        );
    },
    [
        reactFlowInstance,
        nodes,
        edges,
        pushHistory,
        setNodes,
        setSelected,
    ]
);

  /* =======================================================
     UNDO
  ======================================================= */

  const undo =
    useCallback(() => {
      if (
        history.length === 0
      ) {
        toast.info(
          "Nothing to undo."
        );

        return;
      }

      const previous =
        history[
          history.length - 1
        ];

      isUndoRedo.current =
        true;

      setFuture(
        (current) => [
          ...current,
          {
            nodes:
              structuredClone(
                nodes
              ),

            edges:
              structuredClone(
                edges
              ),
          },
        ]
      );

      setNodes(
        structuredClone(
          previous.nodes
        )
      );

      setEdges(
        structuredClone(
          previous.edges
        )
      );

      setHistory(
        (current) =>
          current.slice(0, -1)
      );

      setSelected(null);

      setTimeout(() => {
        isUndoRedo.current =
          false;
      }, 0);
    }, [
      history,
      nodes,
      edges,
      setNodes,
      setEdges,
    ]);

  /* =======================================================
     REDO
  ======================================================= */

  const redo =
    useCallback(() => {
      if (
        future.length === 0
      ) {
        toast.info(
          "Nothing to redo."
        );

        return;
      }

      const next =
        future[
          future.length - 1
        ];

      isUndoRedo.current =
        true;

      setHistory(
        (current) => [
          ...current,
          {
            nodes:
              structuredClone(
                nodes
              ),

            edges:
              structuredClone(
                edges
              ),
          },
        ]
      );

      setNodes(
        structuredClone(
          next.nodes
        )
      );

      setEdges(
        structuredClone(
          next.edges
        )
      );

      setFuture(
        (current) =>
          current.slice(0, -1)
      );

      setSelected(null);

      setTimeout(() => {
        isUndoRedo.current =
          false;
      }, 0);
    }, [
      future,
      nodes,
      edges,
      setNodes,
      setEdges,
    ]);

  /* =======================================================
     NODE CHANGE
  ======================================================= */

  const handleNodesChange =
    useCallback(
      (changes) => {
        onNodesChange(
          changes
        );
      },
      [onNodesChange]
    );

  /* =======================================================
     NODE DRAG START
  ======================================================= */

  const handleNodeDragStart =
    useCallback(() => {
      if (
        !historyReady.current ||
        isUndoRedo.current ||
        isLoadingWorkflow.current
      ) {
        return;
      }

      pushHistory(
        nodes,
        edges
      );
    }, [
      nodes,
      edges,
      pushHistory,
    ]);

  /* =======================================================
     EDGE CHANGE
  ======================================================= */

  const handleEdgesChange =
    useCallback(
      (changes) => {
        const hasRemove =
          changes.some(
            (change) =>
              change.type ===
              "remove"
          );

        if (
          hasRemove &&
          historyReady.current &&
          !isUndoRedo.current &&
          !isLoadingWorkflow.current
        ) {
          pushHistory(
            nodes,
            edges
          );
        }

        onEdgesChange(
          changes
        );
      },
      [
        nodes,
        edges,
        pushHistory,
        onEdgesChange,
      ]
    );

  /* =======================================================
     GET MENU EDGE LABEL
  ======================================================= */

  const getMenuOptionLabel =
    useCallback(
      (
        sourceNodeId,
        sourceHandle
      ) => {
        if (
          !sourceHandle?.startsWith(
            "source-option-"
          )
        ) {
          return "";
        }

        const optionIndex =
          Number(
            sourceHandle.replace(
              "source-option-",
              ""
            )
          );

        const sourceNode =
          nodes.find(
            (node) =>
              node.id ===
              sourceNodeId
          );

        return (
          sourceNode?.data
            ?.menuOptions?.[
            optionIndex
          ]?.label || ""
        );
      },
      [nodes]
    );

  /* =======================================================
     CONNECT
  ======================================================= */

  const onConnect =
    useCallback(
      (connection) => {
        if (
          !connection.source ||
          !connection.target
        ) {
          return;
        }

        pushHistory(
          nodes,
          edges
        );

        const edgeLabel =
          getMenuOptionLabel(
            connection.source,
            connection.sourceHandle
          );

        setEdges(
          (existingEdges) =>
            addEdge(
              {
                ...connection,

                id:
                  `edge-${Date.now()}`,

                animated: true,

                label:
                  edgeLabel ||
                  undefined,
              },

              existingEdges
            )
        );
      },
      [
        nodes,
        edges,
        pushHistory,
        getMenuOptionLabel,
        setEdges,
      ]
    );

  /* =======================================================
     RECONNECT EDGE
  ======================================================= */

  const onReconnect =
    useCallback(
      (
        oldEdge,
        newConnection
      ) => {
        if (
          !newConnection.source ||
          !newConnection.target
        ) {
          return;
        }

        pushHistory(
          nodes,
          edges
        );

        let edgeLabel =
          oldEdge.label || "";

        const menuLabel =
          getMenuOptionLabel(
            newConnection.source,
            newConnection.sourceHandle
          );

        if (menuLabel) {
          edgeLabel =
            menuLabel;
        }

        setEdges(
          (currentEdges) =>
            reconnectEdge(
              oldEdge,

              {
                ...newConnection,

                label:
                  edgeLabel ||
                  undefined,
              },

              currentEdges
            )
        );

        toast.success(
          "Connection updated."
        );
      },
      [
        nodes,
        edges,
        pushHistory,
        getMenuOptionLabel,
        setEdges,
      ]
    );


/* =======================================================
   LOAD TENANTS / CLIENTS (Super Admin only)
======================================================= */

useEffect(() => {
  if (!token || !isSuperAdmin) return;

  let cancelled = false;

  const loadTenants = async () => {
    setLoadingTenants(true);

    try {
      const response = await axios.get(
        `${API}/bots/clients`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const payload = response.data?.data ?? response.data;
      const list = Array.isArray(payload)
        ? payload
        : payload?.data ?? [];

      if (!cancelled) {
        setTenants(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error("TENANT LOAD ERROR:", error);

      if (!cancelled) {
        toast.error(
          error.response?.data?.message ||
          "Unable to load clients."
        );
      }
    } finally {
      if (!cancelled) setLoadingTenants(false);
    }
  };

  loadTenants();

  return () => {
    cancelled = true;
  };
}, [token, isSuperAdmin]);

/* =======================================================
   LOAD BOTS (For user or selected tenant)
======================================================= */

useEffect(() => {
  if (!token) {
    setBots([]);
    return;
  }

  // Super admin must select a tenant first
  if (isSuperAdmin && !selectedTenantId) {
    setBots([]);
    return;
  }

  let cancelled = false;

  const loadBots = async () => {
    setLoadingBots(true);

    try {
      const response = await axios.get(
        `${API}/bots`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const payload = response.data?.data ?? response.data;
      const list = Array.isArray(payload)
        ? payload
        : payload?.data ?? [];

      let userBots = Array.isArray(list) ? list : [];

      if (isSuperAdmin && selectedTenantId) {
        userBots = userBots.filter(
          (bot) =>
            String(bot.tenant_id ?? bot.client?.id) ===
            String(selectedTenantId)
        );
      }

      if (!cancelled) {
        setBots(userBots);

        // Auto-select first bot if none selected or previous invalid
        setSelectedBotId((currentId) => {
          const stillExists = userBots.some(
            (bot) => String(bot.id) === String(currentId)
          );

          if (!stillExists) {
            const nextBotId = userBots[0] ? String(userBots[0].id) : "";
            if (nextBotId) {
              localStorage.setItem("workflow_bot_id", nextBotId);
            } else {
              localStorage.removeItem("workflow_bot_id");
            }
            return nextBotId;
          }

          return currentId;
        });
      }
    } catch (error) {
      console.error("BOT LOAD ERROR:", error);

      if (!cancelled) {
        setBots([]);
      }
    } finally {
     
      if (!cancelled) setLoadingBots(false);
    }
  };

  loadBots();

  return () => {
    cancelled = true;
  };
}, [token, selectedTenantId, isSuperAdmin]);


/* =======================================================
   LOAD WORKFLOWS
======================================================= */
useEffect(() => {
  let isMounted = true;

  const loadWorkflows = async () => {
    if (!token || (isSuperAdmin && !selectedTenantId)) {
      setWorkflows([]);
      setLoadingWorkflows(false);
      return;
    }

    try {
      setLoadingWorkflows(true);

      const params = {};

      if (selectedBotId) {
        params.bot_id = selectedBotId;
      }

      if (isSuperAdmin && selectedTenantId) {
        params.tenant_id = selectedTenantId;
      }

      const response = await axios.get(`${API}/workflows`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const payload = response.data?.data ?? response.data;

      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      if (!isMounted) return;

      setWorkflows(list);

    

   

  const urlParams = new URLSearchParams(window.location.search);

    const urlWorkflowId = urlParams.get("workflow_id");

    const savedWorkflowId =
      urlWorkflowId || localStorage.getItem("workflow_id");

      const savedWorkflowExists = list.some(
        (workflow) =>
          String(workflow.id) === String(savedWorkflowId)
      );

      if (savedWorkflowId && savedWorkflowExists) {
        // Restore saved workflow selection
        setWorkflowId(String(savedWorkflowId));
      } else if (savedWorkflowId && !savedWorkflowExists) {
        // Clear only if workflow is no longer in the loaded list
        localStorage.removeItem("workflow_id");

        setWorkflowId((currentId) =>
          String(currentId) === String(savedWorkflowId)
            ? null
            : currentId
        );

        setNodes([]);
        setEdges([]);
        setSelected(null);
        setHistory([]);
        setFuture([]);

        historyReady.current = true;
        isLoadingWorkflow.current = false;
      }
    } catch (error) {
      console.error(
        "Workflow loading error:",
        error.response?.data || error.message
      );

      if (isMounted) {
        setWorkflows([]);
      }
    } finally {
      if (isMounted) {
        setLoadingWorkflows(false);
        
      }
    }
  };

  loadWorkflows();

  return () => {
    isMounted = false;
  };
}, [token, selectedTenantId, selectedBotId, isSuperAdmin]);

  /* =======================================================
     SELECT WORKFLOW
  ======================================================= */
const selectWorkflow = (id) => {
    if (!id) return;

    const selectedId = String(id);

      setIsLoadingWorkflowPage(true);

    localStorage.setItem("workflow_id", selectedId);
    setWorkflowId(selectedId);

    historyReady.current = false;

    setHistory([]);
    setFuture([]);
    setNodes([]);
    setEdges([]);
    setSelected(null);
     setWorkflowId(selectedId);
};
  /* =======================================================
     NEW WORKFLOW
  ======================================================= */

  const newWorkflow =
    () => {
      localStorage.removeItem(
        "workflow_id"
      );

      setWorkflowId(null);

      // setName(
      //   "New WhatsApp Workflow"
      // );

      historyReady.current =
        true;

      setHistory([]);
      setFuture([]);

      setNodes([]);
      setEdges([]);

      setSelected(null);
    };

  /* =======================================================
     LOAD SELECTED WORKFLOW
  ======================================================= */

  useEffect(() => {
  if (
  !token ||
  !workflowId ||
  loadingWorkflows
) {
  return;
}

const workflowExists = workflows.some(
  (workflow) => String(workflow.id) === String(workflowId)
);

if (!workflowExists) {
  return;
}

    const loadWorkflow =
      async () => {
        setIsLoadingWorkflowPage(true);
        try {
          isLoadingWorkflow.current =
            true;

          historyReady.current =
            false;
          
            

          setHistory([]);
          setFuture([]);

          const response =
            await axios.get(
              API +
                "/workflows/" +
                workflowId,
              {
                headers: {
                  Authorization:
                    "Bearer " +
                    token,
                },
              }
            );

          const workflow =
            response.data?.data ||
            response.data;

          if (workflow.name) {
            setName(
              workflow.name
            );
          }

          /* ===============================================
             NODES
          =============================================== */

          const loadedNodes =
            (
              workflow.nodes ||
              []
            ).map((node) => {
              let configuration =
                node.configuration ||
                {};

              if (
                typeof configuration ===
                "string"
              ) {
                try {
                  configuration =
                    JSON.parse(
                      configuration
                    );
                } catch {
                  configuration =
                    {};
                }
              }

              let menuOptions =
                configuration.menuOptions;

              if (
                !Array.isArray(
                  menuOptions
                )
              ) {
                menuOptions =
                  node.node_type ===
                  "menu"
                    ? defaultMenuOptions.map(
                        (
                          option
                        ) => ({
                          ...option,
                        })
                      )
                    : [];
              }

              return {
                id: node.node_id,

                type:
                  node.node_type,

                position: {
                  x: Number(
                    node.position_x ||
                      0
                  ),

                  y: Number(
                    node.position_y ||
                      0
                  ),
                },

                data: {
                  label:
                    node.label ||
                    node.node_type,

                  ...configuration,

                  menuOptions,
                },
              };
            });

          /* ===============================================
             EDGES
          =============================================== */

          const loadedEdges =
            (
              workflow.edges ||
              []
            ).map((edge) => {
              let configuration =
                edge.configuration ||
                {};

              if (
                typeof configuration ===
                "string"
              ) {
                try {
                  configuration =
                    JSON.parse(
                      configuration
                    );
                } catch {
                  configuration =
                    {};
                }
              }

              const reactEdge = {
                id:
                  edge.edge_id,

                source:
                  edge.source,

                target:
                  edge.target,

                animated: true,
              };

              if (
                edge.source_handle
              ) {
                reactEdge.sourceHandle =
                  edge.source_handle;
              }

              if (
                edge.target_handle
              ) {
                reactEdge.targetHandle =
                  edge.target_handle;
              }

              if (
                edge.label
              ) {
                reactEdge.label =
                  edge.label;
              }

              if (
                configuration?.animated !==
                undefined
              ) {
                reactEdge.animated =
                  configuration.animated;
              }

              return reactEdge;
            });

          setNodes(
            loadedNodes
          );

          setEdges(
            loadedEdges
          );

          setHistory([]);
          setFuture([]);

          setTimeout(() => {
            historyReady.current =
              true;

            isLoadingWorkflow.current =
              false;
            setIsLoadingWorkflowPage(false);
          }, 100);
        } catch (error) {
           setIsLoadingWorkflowPage(false);
          console.error("WORKFLOW LOAD ERROR:", {
        url: error.config?.url,
        status: error.response?.status,
        response: error.response?.data,
        userId: JSON.parse(
            localStorage.getItem("user") || "null"
        )?.id,
    });

          isLoadingWorkflow.current =
            false;

          toast.error(
            error?.response
              ?.data?.message ||
              "Unable to load workflow."
          );
        }
      };

      loadWorkflow();
  }, [
    token,
    workflowId,
    workflows,
    loadingWorkflows,
    setNodes,
    setEdges,
  ]);

 
 /* =======================================================
   ADD NODE
======================================================= */

const addNode = (type) => {

  const id = type + "-" + Date.now();

  const menuOptions =
    type === "menu"
      ? defaultMenuOptions.map((option, index) => ({
          id:
            option.id ||
            `option-${index + 1}`,

          label: option.label,
        }))
      : [];

  /* =====================================================
     NODE MESSAGE
  ===================================================== */

  let nodeMessage = "";

  if (type === "message") {
    nodeMessage = "Hello! Welcome.";
  }

  if (type === "button") {
    nodeMessage = "Please choose an option.";
  }

  if (type === "menu") {
    nodeMessage = "Please select an option:";
  }

  if (type === "userInput") {
    nodeMessage = "What is your name?";
  }

  if (type === "otp") {
    nodeMessage =
      "Please enter the OTP sent to your mobile number.";
  }

  /* =====================================================
     NODE DATA
  ===================================================== */

  const newNode = {
    id,

    type,

    position: {
      x: 300 + Math.random() * 350,
      y: 100 + Math.random() * 400,
    },

    data: {

      /* =================================================
         BASIC
      ================================================= */

      label:
        palette.find(
          (item) => item[0] === type
        )?.[1] || type,

      message: nodeMessage,

      /* =================================================
         USER INPUT
      ================================================= */

      variable:
        type === "userInput"
          ? "customer_name"
          : type === "otp"
          ? "otp"
          : "",

      required:
        type === "userInput"
          ? true
          : true,

      allowSkip:
        type === "userInput"
          ? false
          : false,

      skipText:
        type === "userInput"
          ? "skip"
          : "skip",

      validationType:
        type === "userInput"
          ? "text"
          : "text",

      validationMessage:
        type === "userInput"
          ? "⚠️ Please enter a valid response."
          : "⚠️ Please enter a valid response.",

      requiredMessage:
        type === "userInput"
          ? "⚠️ This field is required. Please enter a valid response."
          : "⚠️ This field is required. Please enter a valid response.",

      minLength: "",
      maxLength: "",
      minValue: "",
      maxValue: "",
      regex: "",

      /* =================================================
         BUTTON
      ================================================= */

      buttonText:
        type === "button"
          ? "Verify Mobile"
          : "",

          buttonValue:
          type === "button"
              ? "verify_mobile"
              : "",

      /* =================================================
         MENU
      ================================================= */

      menuOptions,

      /* =================================================
         CONDITION
      ================================================= */

      condition:
        type === "condition"
          ? "customer.points > 100"
          : "",

      /* =================================================
         API
      ================================================= */

      method: "GET",

      apiUrl: "",

      /* =================================================
         MEDIA
      ================================================= */

      imageUrl: "",

      videoUrl: "",

      documentUrl: "",

      audioUrl: "",

      mediaUrl: "",

      caption: "",

      /* =================================================
         DELAY
      ================================================= */

      delay: "5",

      delayUnit: "seconds",

      /* =================================================
         OTP
      ================================================= */

      otpLength:
        type === "otp"
          ? 6
          : 6,

      expiryMinutes:
        type === "otp"
          ? 5
          : 5,

      maxAttempts:
        type === "otp"
          ? 3
          : 3,

      otpMessage:
        type === "otp"
          ? "Your OTP is {{otp}}"
          : "",

      otpVariable:
        type === "otp"
          ? "otp"
          : "",

      otpVerifiedVariable:
        type === "otp"
          ? "otp_verified"
          : "",

      /* =================================================
         OTP PROVIDER
      ================================================= */

      sendOtpUrl: "",

      verifyOtpUrl: "",

      sendOtpMethod: "POST",

      verifyOtpMethod: "POST",

      sendOtpPayload: {},

      verifyOtpPayload: {},

    },
  };

  /* =====================================================
     HISTORY
  ===================================================== */

  pushHistory(
    nodes,
    edges
  );

  /* =====================================================
     ADD NODE
  ===================================================== */

  setNodes(
    (existingNodes) =>
      existingNodes.concat(
        newNode
      )
  );

  /* =====================================================
     SELECT NODE
  ===================================================== */

  setSelected(
    newNode
  );
};

/* =======================================================
   DELETE NODE
======================================================= */

const deleteNode = useCallback(
  (nodeId) => {
    if (!nodeId) {
      return;
    }

    const node = nodes.find(
      (item) => String(item.id) === String(nodeId)
    );

    if (!node) {
      console.warn("Node not found:", nodeId);
      return;
    }

    // Start / End cannot be deleted
    if (
      node.type === "start" ||
      node.type === "end"
    ) {
      toast.warning(
        "Start and End nodes cannot be deleted."
      );

      return;
    }

    // Save current state for undo
    pushHistory(
      nodes,
      edges
    );

    // Delete node
    setNodes(
      (currentNodes) =>
        currentNodes.filter(
          (item) =>
            String(item.id) !== String(nodeId)
        )
    );

    // Delete connected edges
    setEdges(
      (currentEdges) =>
        currentEdges.filter(
          (edge) =>
            String(edge.source) !== String(nodeId) &&
            String(edge.target) !== String(nodeId)
        )
    );

    // Clear selection
    setSelected(null);

    toast.success(
      "Node deleted successfully."
    );
  },
  [
    nodes,
    edges,
    pushHistory,
    setNodes,
    setEdges,
    setSelected,
  ]
);

useEffect(() => {
  const handleDeleteRequest = (event) => {
    const nodeId = event.detail?.nodeId;

    if (!nodeId) {
      return;
    }

    deleteNode(nodeId);
  };

  window.addEventListener(
    "workflow-node-delete",
    handleDeleteRequest
  );

  return () => {
    window.removeEventListener(
      "workflow-node-delete",
      handleDeleteRequest
    );
  };
}, [deleteNode]);



const save = async (publish = false) => {

    
  if (!token) {
    toast.warning("Please login first.");
    return;
  }

  if (!name.trim()) {
    toast.warning("Please enter workflow name.");
    return;
  }

  // Publish se pehle Save required hai.
  if (publish && !saved) {
    toast.warning("Please save the workflow before publishing.");
    return;
  }

  setSaving(true);

  try {
    const headers = {
      Authorization: "Bearer " + token,
    };

    let id = workflowId;

    /* CREATE WORKFLOW */
    if (!id) {
      const response = await axios.post(
        API + "/workflows",
        {
          name,
          channel: "whatsapp",
          tenant_id: selectedTenantId || null,
          bot_id: selectedBotId || null,
        },
        { headers }
      );

      id = response.data?.id || response.data?.data?.id;

      if (!id) {
        throw new Error("Workflow ID was not returned.");
      }

      setWorkflowId(String(id));

      localStorage.setItem("workflow_id", String(id));

      const createdWorkflow = response.data?.data || response.data;

      setWorkflows((current) => [
        createdWorkflow,
        ...current,
      ]);
    }

    /* PREPARE EDGES */
    const edgesToSave = edges.map((edge) => ({
      ...edge,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
      type: edge.type || "smoothstep",
      label: edge.label || null,
    }));

    /* SAVE WORKFLOW DATA */
    await axios.put(
      API + "/workflows/" + id,
      {
        name,
        nodes,
        edges: edgesToSave,
      },
      { headers }
    );

    /* UPDATE DROPDOWN */
    setWorkflows((current) =>
      current.map((workflow) =>
        String(workflow.id) === String(id)
          ? { ...workflow, name }
          : workflow
      )
    );

    // Save successful: workflow ab saved hai.
    setSaved(true);

    /* PUBLISH */
    if (publish) {
      await axios.post(
        API + "/workflows/" + id + "/publish",
        {},
        { headers }
      );

      toast.success("Workflow published successfully.");
    } else {
      toast.success("Workflow saved successfully.");
    }
  } catch (error) {
    console.error("WORKFLOW ERROR:", error);

    // Save ya publish fail hone par success assume na karein.
    toast.error(
      error?.response?.data?.message ||
        error.message ||
        "Something went wrong."
    );
  } finally {
    setSaving(false);
  }
};

  /* =======================================================
     KEYBOARD SHORTCUTS
  ======================================================= */

  useEffect(() => {
    const handleKeyboard =
      (event) => {
        const active =
          document.activeElement;

        const isTyping =
          active &&
          [
            "INPUT",
            "TEXTAREA",
            "SELECT",
          ].includes(
            active.tagName
          );

        /* =============================================
           UNDO
        ============================================== */

        if (
          (event.ctrlKey ||
            event.metaKey) &&
          event.key.toLowerCase() ===
            "z" &&
          !event.shiftKey
        ) {
          if (!isTyping) {
            event.preventDefault();

            undo();
          }

          return;
        }

        /* =============================================
           REDO
        ============================================== */

        if (
          (event.ctrlKey ||
            event.metaKey) &&
          (
            event.key.toLowerCase() ===
              "y" ||
            (
              event.key.toLowerCase() ===
                "z" &&
              event.shiftKey
            )
          )
        ) {
          if (!isTyping) {
            event.preventDefault();

            redo();
          }

          return;
        }

        if (
          event.key !==
            "Delete" &&
          event.key !==
            "Backspace"
        ) {
          return;
        }

        if (isTyping) {
          return;
        }

        if (selected) {
          event.preventDefault();

          deleteNode(
            selected.id
          );
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  }, [
    selected,
    deleteNode,
    undo,
    redo,
  ]);


useEffect(() => {
  const canShowGuide =
    !isLoadingWorkflowPage &&
    !loadingWorkflows &&
    !loadingBots &&
    !loadingTenants &&
    !workflowModalOpen &&
    workflows.length === 0 &&
    Boolean(token) &&
    (!isSuperAdmin || Boolean(selectedTenantId)) &&
    Boolean(selectedBotId);

  setShowFirstWorkflowGuide(canShowGuide);
}, [
  isLoadingWorkflowPage,
  loadingWorkflows,
  loadingBots,
  loadingTenants,
  workflowModalOpen,
  workflows.length,
  token,
  isSuperAdmin,
  selectedTenantId,
  selectedBotId,
]);

if (loadingBots) {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

        <p className="text-sm font-semibold text-slate-700">
          Loading your bot...
        </p>

        <p className="text-xs text-slate-500">
          Please wait while your workflow loads.
        </p>
      </div>
    </div>
  );
}

  return (
    <>

<ToastContainer
  position="bottom-center"
  autoClose={3000}
  newestOnTop
  closeOnClick
  pauseOnHover
  theme="light"
/>

      <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      
        <header
          className="
            z-20
            flex
            min-h-[72px]
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-200
            bg-white
            px-4
            shadow-sm
            md:px-6
          "
        >
          {/* LEFT */}

          <div className="flex min-w-0 items-center gap-3">
        
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
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
                shadow-sm
                transition
                hover:border-indigo-300
                hover:bg-indigo-50
                hover:text-indigo-600
                focus:outline-none
                focus:ring-4
                focus:ring-indigo-500/10
              "
              title="Back to Admin Panel"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* =======================================================
            TENANT SELECT (Super Admin only)
        ======================================================= */}

        {isSuperAdmin && (
          <select
            value={selectedTenantId}
            disabled={loadingTenants}
            onChange={(e) => {
              const id = e.target.value;

              setSelectedTenantId(id);
              setSelectedBotId("");

              localStorage.removeItem("workflow_bot_id");
              localStorage.setItem("workflow_tenant_id", id);

              // Reset workflow selection when changing tenant.
              localStorage.removeItem("workflow_id");
              setWorkflowId(null);
              setWorkflows([]);
              setNodes([]);
              setEdges([]);
              setSelected(null);
              setHistory([]);
              setFuture([]);
            }}
            className="h-10 w-[160px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">
              {loadingTenants ? "Loading clients..." : "Select Client"}
            </option>

            {tenants.map((tenant) => (
              <option key={tenant.id} value={String(tenant.id)}>
                {tenant.name}
              </option>
            ))}
          </select>
        )}

    {/* =======================================================
        BOT SELECT
    ======================================================= */}

    <select
      value={selectedBotId}
      disabled={(isSuperAdmin && !selectedTenantId) || loadingBots}
      onChange={(e) => {
        const id = e.target.value;

        setSelectedBotId(id);

        if (id) {
          localStorage.setItem("workflow_bot_id", id);
        } else {
          localStorage.removeItem("workflow_bot_id");
        }

    
        localStorage.removeItem("workflow_id");
        setWorkflowId(null);
        setWorkflows([]);
        setNodes([]);
        setEdges([]);
        setSelected(null);
        setHistory([]);
        setFuture([]);
      }}
      className="h-10 w-[160px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
    >
      <option value="">
        {isSuperAdmin && !selectedTenantId
          ? "Select client first"
          : loadingBots
          ? "Loading bots..."
          : "Select Bot"}
      </option>

      {bots.map((bot) => (
        <option key={bot.id} value={String(bot.id)}>
          {bot.name}
        </option>
      ))}
    </select>
          

{/* WORKFLOW SELECT + NEW WORKFLOW */}

<div className="relative flex items-center gap-2">

  {/* Dropdown sirf workflow create hone ke baad dikhega */}
  {!loadingWorkflows && workflows.length > 0 && (
    <div className="relative">
      <select
        value={workflowId || ""}
        onChange={(e) => {
          const id = e.target.value;

          if (id === "new") {
            setWorkflowModalMode("add");
            setWorkflowFormName("");
            setWorkflowFormDescription("");
            setWorkflowModalOpen(true);
            return;
          }

          if (id) selectWorkflow(id);
        }}
        disabled={saving}
        className="
          h-10 w-[220px] appearance-none
          rounded-xl border border-slate-200
          bg-white pl-4 pr-10 text-sm
          font-semibold text-slate-700 shadow-sm
          outline-none transition hover:border-indigo-300
          focus:border-indigo-500
          focus:ring-4 focus:ring-indigo-500/10
          disabled:cursor-not-allowed
          disabled:bg-slate-100
        "
      >
        <option value="" disabled>
          Select Workflow
        </option>

    

        {workflows.map((workflow) => (
          <option key={workflow.id} value={String(workflow.id)}>
            {workflow.name}
          </option>
        ))}
      </select>

      <ChevronDown
        className="
          pointer-events-none absolute right-3 top-1/2
          h-4 w-4 -translate-y-1/2 text-slate-400
        "
      />
    </div>
  )}

  <button
    type="button"
    onClick={() => {
      setWorkflowModalMode("add");
      setWorkflowFormName("");
      setWorkflowFormDescription("");
      setWorkflowModalOpen(true);
    }}
    className="
      inline-flex min-h-11 items-center justify-center gap-2
      rounded-xl bg-emerald-700 px-5 py-3
      text-sm font-bold text-white shadow-md
      transition hover:bg-emerald-800
    "
  >
    <Plus className="h-4 w-4" />
    New Add
  </button>

</div>
{/* ADD / UPDATE WORKFLOW MODAL */}

{workflowModalOpen && (
  <div
    className="fixed inset-0  flex items-center justify-center bg-slate-900/50 p-4"
    onClick={() => setWorkflowModalOpen(false)}
  >
    <div
      className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {workflowModalMode === "add"
              ? "Add New Workflow"
              : "Update Workflow"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter your workflow details below.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setWorkflowModalOpen(false)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
     onSubmit={async (e) => {
  e.preventDefault();

  const workflowName = workflowFormName.trim();

  if (!workflowName) {
    toast.error("Please Add New workflow.");
    return;
  }

  if (isSuperAdmin && !selectedTenantId) {
    toast.error("Please select a client first.");
    return;
  }

  if (!selectedBotId) {
    toast.error("Please select a bot first.");
    return;
  }

  const isUpdate = workflowModalMode === "update";

  if (isUpdate && !workflowId) {
    toast.error("Please select a workflow to update.");
    return;
  }

  try {
    setSaving(true);

    const payload = {
      name: workflowName,
      description: workflowFormDescription.trim() || null,
      channel: "whatsapp",
      ...(selectedTenantId ? { tenant_id: selectedTenantId } : {}),
      bot_id: selectedBotId,
    };

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    // ADD = POST, UPDATE = PUT
    const response = isUpdate
      ? await axios.put(
          `${API}/workflows/${workflowId}`,
          payload,
          config
        )
      : await axios.post(
          `${API}/workflows`,
          payload,
          config
        );

    const savedWorkflow =
      response.data?.data?.data ??
      response.data?.data ??
      response.data;

    if (!savedWorkflow?.id && !isUpdate) {
      console.error("Unexpected API response:", response.data);
      throw new Error("Server did not return the new workflow ID.");
    }

    const savedId = String(savedWorkflow.id ?? workflowId);

    // Refresh workflow list in state
    setWorkflows((previous) => {
      if (isUpdate) {
        return previous.map((item) =>
          String(item.id) === savedId
            ? { ...item, ...savedWorkflow, ...payload }
            : item
        );
      }

      return [
        { ...savedWorkflow, ...payload },
        ...previous.filter(
          (item) => String(item.id) !== savedId
        ),
      ];
    });

    // Select saved workflow
    setWorkflowId(savedId);
    localStorage.setItem("workflow_id", savedId);

    setName(savedWorkflow.name || workflowName);

    setWorkflowModalOpen(false);

    toast.success(
      isUpdate
        ? "Workflow updated successfully."
        : "New workflow created successfully."
    );
  } catch (error) {
    console.error(
      "Save workflow error:",
      error.response?.data || error.message
    );

    toast.error(
      error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to save workflow."
    );
  } finally {
    setSaving(false);
  }
}}
        className="space-y-5"
      >
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Workflow Name
          </label>

          <input
            type="text"
            value={workflowFormName}
            onChange={(e) => setWorkflowFormName(e.target.value)}
            placeholder="Enter workflow name"
            maxLength={150}
            required
            autoFocus
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Description
          </label>

          <textarea
            value={workflowFormDescription}
            onChange={(e) =>
              setWorkflowFormDescription(e.target.value)
            }
            placeholder="Enter workflow description (optional)"
            rows={3}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setWorkflowModalOpen(false)}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Add Workflow"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

<button
  type="button"
  onClick={openUpdateWorkflowModal}
  disabled={!workflowId || saving}
  className="
    hidden h-10 shrink-0 items-center gap-2
    rounded-xl border border-amber-200 bg-amber-50
    px-4 text-sm font-bold text-amber-700
    transition hover:bg-amber-100
    disabled:cursor-not-allowed disabled:opacity-40
    md:flex
  "
>
  <Save className="h-4 w-4" />
  Update
</button>

  {/* DELETE SELECTED WORKFLOW */}

        <button
  type="button"
  title="Delete selected workflow"
  aria-label="Delete selected workflow"
  disabled={!workflowId || saving}
  onClick={() => {
    const selectedWorkflow = workflows.find(
      (workflow) => String(workflow.id) === String(workflowId)
    );

    if (!selectedWorkflow) {
      toast.error("Please select a workflow first.");
      return;
    }

    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-800">
          Are you sure you want to delete "{selectedWorkflow.name}"?
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              toast.dismiss(t.id);

              try {
                setSaving(true);

                await axios.delete(`${API}/workflows/${workflowId}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                  },
                });

                setWorkflows((previous) =>
                  previous.filter(
                    (workflow) => String(workflow.id) !== String(workflowId)
                  )
                );

                setWorkflowId(null);
                localStorage.removeItem("workflow_id");
                setNodes([]);
                setEdges([]);
                setSelected(null);
                setName("");

                toast.success("Workflow deleted successfully.");
              } catch (error) {
                console.error(
                  "Delete workflow error:",
                  error.response?.data || error.message
                );

                toast.error(
                  error.response?.data?.message ||
                    "Failed to delete workflow."
                );
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  }}
  className="
    inline-flex h-10 shrink-0 items-center justify-center
    rounded-xl border border-red-200 bg-white px-3
    text-red-600 shadow-sm transition
    hover:border-red-300 hover:bg-red-50
    disabled:cursor-not-allowed disabled:opacity-40
  "
>
  <Trash2 className="h-4 w-4" />
</button>
                    

            {/* NAME */}

            {/* <input
              className="
                hidden
                w-[180px]
                rounded-lg
                border
                border-slate-200
                bg-slate-50
                px-3
                py-2
                text-sm
                font-medium
                text-slate-700
                outline-none
                transition
                focus:border-indigo-500
                focus:bg-white
                lg:block
              "
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="Workflow name"
            /> */}

             {/* SIMULATOR */}

             <button
  type="button"
  onClick={() => {
    if (workflowId) {
      localStorage.setItem("selected_workflow_id", String(workflowId));
    }

    navigate(
      workflowId
        ? `/whatsapp-simulator?workflow_id=${workflowId}`
        : "/whatsapp-simulator"
    );
  }}
  className="
    inline-flex min-h-11 items-center justify-center gap-2
    rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold
    text-white shadow-md transition hover:bg-emerald-800
    disabled:cursor-not-allowed disabled:opacity-60
  "
>
  <Play className="h-4 w-4" />
  Simulator
</button>

          </div>

       

          {/* ACTIONS */}

          <div className="flex items-center gap-2">

               {/* CENTER UNDO REDO */}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={undo}
              disabled={
                history.length ===
                0
              }
              title="Undo (Ctrl + Z)"
              className={`
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                border
                transition-all
                ${
                  history.length >
                  0
                    ? `
                      border-slate-200
                      bg-white
                      text-slate-600
                      hover:border-indigo-200
                      hover:bg-indigo-50
                      hover:text-indigo-600
                    `
                    : `
                      cursor-not-allowed
                      border-slate-100
                      bg-slate-50
                      text-slate-300
                    `
                }
              `}
            >
              <Undo2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={redo}
              disabled={
                future.length ===
                0
              }
              title="Redo (Ctrl + Y)"
              className={`
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                border
                transition-all
                ${
                  future.length >
                  0
                    ? `
                      border-slate-200
                      bg-white
                      text-slate-600
                      hover:border-indigo-200
                      hover:bg-indigo-50
                      hover:text-indigo-600
                    `
                    : `
                      cursor-not-allowed
                      border-slate-100
                      bg-slate-50
                      text-slate-300
                    `
                }
              `}
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          
 {/* SAVE */}
        <button
          type="button"
          onClick={() => save(false)}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:px-4"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
        </button>

        {/* PUBLISH */}
        <button
          type="button"
          onClick={() => save(true)}
          disabled={saving || !saved}
          title={!saved ? "Save the workflow before publishing" : "Publish workflow"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Publish
        </button>

         
          </div>
        </header>

        {/* =================================================
            MOBILE WORKFLOW
        ================================================= */}

        <div className="border-b border-slate-200 bg-white p-3 md:hidden">
          <div className="flex gap-2">
        <select
  value={workflowId || ""}
  onChange={async (e) => {
    const value = e.target.value;

    // =====================================
    // DELETE SELECTED WORKFLOW
    // =====================================
    if (value === "__delete_workflow__") {
      if (!workflowId) {
        toast.error("Please select a workflow first.");
        return;
      }

      const selectedWorkflow = workflows.find(
        (workflow) =>
          String(workflow.id) === String(workflowId)
      );

      if (!selectedWorkflow) {
        toast.error("Selected workflow not found.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete "${selectedWorkflow.name}"?`
      );

      if (!confirmed) {
        return;
      }

      try {
        setSaving(true);

        await axios.delete(
          `${API}/workflows/${workflowId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        toast.success("Workflow deleted successfully.");

        setWorkflows((previous) =>
          previous.filter(
            (workflow) =>
              String(workflow.id) !== String(workflowId)
          )
        );

        setWorkflowId(null);
        localStorage.removeItem("workflow_id");

        setNodes([]);
        setEdges([]);
   
      } catch (error) {
        console.error(
          "Delete workflow error:",
          error.response?.data || error.message
        );

        toast.error(
          error.response?.data?.message ||
            "Failed to delete workflow."
        );
      } finally {
        setSaving(false);
      }

      return;
    }

      // =====================================
      // NORMAL WORKFLOW SELECTION
      // =====================================
      selectWorkflow(value);
    }}
    disabled={loadingWorkflows || saving}
    className="
      min-w-0
      flex-1
      rounded-lg
      border
      border-slate-200
      bg-white
      px-3
      py-2
      text-sm
      font-semibold
      text-slate-700
      outline-none
      transition
      focus:border-indigo-500
      focus:ring-2
      focus:ring-indigo-100
      disabled:cursor-not-allowed
      disabled:bg-slate-100
      disabled:text-slate-400
    "
  >
    <option value="">
      {isSuperAdmin && !selectedTenantId
        ? "Select Client First"
        : !selectedBotId
          ? "Select Bot First"
          : loadingWorkflows
            ? "Loading Workflows..."
            : workflows.length === 0
              ? "No Workflows Found"
              : "Select Workflow"}
    </option>

    {/* WORKFLOW LIST */}
    {workflows.map((workflow) => (
      <option
        key={workflow.id}
        value={String(workflow.id)}
      >
        {workflow.name || `Workflow #${workflow.id}`}
      </option>
    ))}

    {/* DELETE OPTION — ALWAYS VISIBLE */}
    <option
      value="__delete_workflow__"
      disabled={!workflowId || workflows.length === 0}
    >
      🗑 Delete Selected Workflow
    </option>
  </select>

          

            <button
              type="button"
              onClick={
                newWorkflow
              }
              className="
                rounded-lg
                bg-indigo-50
                px-3
                py-2
                text-sm
                font-bold
                text-indigo-700
              "
            >
              +
            </button>
          </div>

          <input
            className="
              mt-2
              w-full
              rounded-lg
              border
              border-slate-200
              bg-slate-50
              px-3
              py-2
              text-sm
              font-medium
              outline-none
              focus:border-indigo-500
            "
            value={name}
            onChange={(e) =>
              setName(
                e.target.value
              )
            }
            placeholder="Workflow name"
          />
        </div>

        {/* =================================================
            WORKSPACE
        ================================================= */}

        <main
          className="
            flex
            min-h-0
            w-full
            flex-1
            flex-row
            overflow-hidden
            bg-slate-100
          "
        >
          {/* =================================================
              LEFT SIDEBAR
          ================================================= */}

          <aside
            className="
              flex
              h-full
              w-[210px]
              min-w-[210px]
              shrink-0
              flex-col
              overflow-hidden
              border-r
              border-slate-200
              bg-white
            "
          >
            
            <div className="min-h-0 flex-1 overflow-y-auto p-2.5 left-sidebar-scroll">
              <div className="flex flex-col gap-1.5">
              {palette.map(
                ([type, label]) => {
                  const Icon =
                    paletteIcons[type];

                  return (
                    <button
                  key={type}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                      event.dataTransfer.setData(
                          "application/reactflow",
                          type
                      );
                      event.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => addNode(type)}
                      className="
                        group
                        flex
                        w-full
                        min-w-0
                        items-center
                        gap-2.5
                        rounded-lg
                        border
                        border-slate-200
                        bg-white
                        px-2.5
                        py-2
                        text-left
                        transition-all
                        hover:border-indigo-200
                        hover:bg-indigo-50
                        hover:shadow-sm
                        active:scale-[0.98]
                      "
                    >
                      {/* =================================================
                          NODE ICON
                      ================================================== */}

                      <span
                        className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          bg-slate-50
                          text-slate-500
                          transition-all
                          group-hover:bg-indigo-100
                          group-hover:text-indigo-600
                        "
                      >
                        {Icon && (
                          <Icon
                            className="
                              h-4
                              w-4
                            "
                            strokeWidth={2}
                          />
                        )}
                      </span>

                      {/* =================================================
                          LABEL
                      ================================================== */}

                      <span
                        className="
                          min-w-0
                          flex-1
                          truncate
                          text-[12px]
                          font-semibold
                          text-slate-700
                          group-hover:text-indigo-700
                        "
                      >
                        {label}
                      </span>

                      {/* =================================================
                          ADD ICON
                      ================================================== */}

                      <span
                        className="
                          flex
                          h-6
                          w-6
                          shrink-0
                          items-center
                          justify-center
                          rounded-md
                          text-slate-300
                          transition-all
                          group-hover:bg-indigo-100
                          group-hover:text-indigo-600
                        "
                      >
                        <Plus
                          className="h-3.5 w-3.5"
                        />
                      </span>
                    </button>
                  );
                }
              )}
              </div>
            </div>
          </aside>

          {/* =================================================
              CANVAS
          ================================================= */}

           <section
              ref={reactFlowWrapper}
              className="
                  relative
                  h-full
                  min-h-0
                  min-w-0
                  flex-1
                  overflow-hidden
              "
          >
              <ReactFlow
                  nodes={nodes.map((node) => ({
                      ...node,
                      selected: selected?.id === node.id,
                      data: {
                          ...node.data,
                      },
                  }))}
                  edges={edges}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onNodesChange={handleNodesChange}
                  onEdgesChange={handleEdgesChange}
                  onConnect={onConnect}
                  onReconnect={onReconnect}
                  edgesReconnectable={true}
                  onNodeDragStart={handleNodeDragStart}
                  onNodeClick={(_event, node) => setSelected(node)}
                  onPaneClick={() => setSelected(null)}
                  nodeTypes={nodeTypes}
                  defaultViewport={{ x: 80, y: 80, zoom: 0.65 }}
                  minZoom={0.4}
                  maxZoom={1.5}
                  fitView={false}
                  proOptions={{ hideAttribution: true }}
              >
                  <MiniMap nodeStrokeWidth={3} pannable zoomable />
                  <Controls />
                  <Background gap={20} size={1} />
              </ReactFlow>
          </section>

          {/* =================================================
              RIGHT SIDEBAR
          ================================================= */}

          <aside
            className="
              flex
              h-full
              w-[350px]
              min-w-[350px]
              shrink-0
              flex-col
              overflow-hidden
              border-l
              border-slate-200
              bg-white
            "
          >
            <div
              className="
                flex
                shrink-0
                items-center
                justify-between
                border-b
                border-slate-100
                px-5
                py-4
              "
            >
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Node Configuration
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Configure selected
                  step
                </p>
              </div>

              {selected && (
                <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase text-green-600">
                  <Settings2 className="h-3 w-3" />

                  {selected.type ===
                  "userInput"
                    ? "USER INPUT"
                    : selected.type ===
                      "menu"
                    ? "MAIN MENU"
                    : selected.type}
                </span>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {selected ? (
                <Config
                  key={
                    selected.id
                  }

                  node={
                    selected
                  }

                  nodes={
                    nodes
                  }

                  edges={
                    edges
                  }

                  setNodes={
                    setNodes
                  }

                  setEdges={
                    setEdges
                  }

                  setSelected={
                    setSelected
                  }

                  pushHistory={
                    pushHistory
                  }

                  onDelete={() =>
                    deleteNode(
                      selected.id
                    )
                  }
                />
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Settings2 className="h-6 w-6" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-700">
                    No node selected
                  </h3>

                  <p className="mt-2 max-w-[230px] text-xs leading-5 text-slate-400">
                    Select a node from
                    the canvas to
                    configure its
                    properties.
                  </p>
                </div>
              )}
            </div>
          </aside>


{/* =================================================
    FIRST WORKFLOW REQUIRED - FULL PAGE OVERLAY
================================================= */}
{showEmptyWorkflowOverlay && 
 (
  <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

<button
  type="button"
  onClick={() => {
    setShowEmptyWorkflowOverlay(false);
    navigate(-1);
  }}
  className="cursor-pointer absolute left-6 top-6 z-[10002] flex items-center gap-2 rounded-xl border border-white/30 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-lg transition-all duration-300 hover:-translate-x-1 hover:bg-slate-100 hover:shadow-xl active:scale-95"
>
  <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
  Back
</button>

    {/* Animated arrow and instruction */}
<div className="absolute right-8 top-24 z-[10001] hidden flex-col items-center gap-3 md:flex">

  {/* Animated Arrow */}
  <div className="animate-bounce">
    <svg
      width="55"
      height="55"
      viewBox="0 0 55 55"
      fill="none"
    >
      <path
        d="M27 5 L27 40 M13 27 L27 41 L41 27"
        stroke="#F59E0B"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>

  {/* Add Workflow Button */}
<button
  type="button"
onClick={() => {
  setShowEmptyWorkflowOverlay(false);
  setIsLoadingWorkflowPage(false);
  setWorkflowModalMode("add");
  setWorkflowFormName("");
  setWorkflowFormDescription("");
  setWorkflowModalOpen(true);
}}
  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-emerald-700"
>
  <Plus className="h-5 w-5" />
  Add New Workflow
</button>

  <p className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow">
    Start Here!
  </p>
</div>
    {/* Warning card */}
    <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900">
        No Journey Created Yet!
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Create your first WhatsApp workflow to unlock the canvas
        and start building your journey.
      </p>

      <div className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        Please click Add New Workflow above.
      </div>
    </div>
  </div>
)}
        </main>
      </div>
    
    </>
  )
}

export default WorkflowBuilder
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
  Zap
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
import OtpNode from "./OtpNode";

import axios from "axios";
import { useNavigate } from "react-router-dom";


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
    label: "Products",
  },
  {
    id: "option-2",
    label: "Orders",
  },
  {
    id: "option-3",
    label: "Support",
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
          {/* =================================================
              OPTION SOURCE HANDLE - LEFT
          ================================================== */}
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

          {/* NUMBER */}
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

          {/* OPTION LABEL */}
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
            {option.label ||
              option.title ||
              option.text ||
              `Option ${index + 1}`}
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
) : (
  /* =====================================================
     NORMAL CONTENT
  ====================================================== */

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

// const ConditionNode = (props) => (
//   <Node {...props} type="condition" />
// );



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
  // condition: ConditionNode,


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

  // ["condition", "Condition"],

  ["api", "API"],

  // ["image", "Image"],
  ["media_template", "Media Template"],
  // ["video", "Video"],
  // ["document", "Document"],
  // ["pdf", "PDF"],
  // ["audio", "Audio"],

  ["delay", "Delay"],
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

  buttonText: "",

  buttonValue: "",


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

  imageUrl: "",

  videoUrl: "",

  documentUrl: "",

  audioUrl: "",

  mediaUrl: "",

  fileName: "",

  caption: "",

  mediaType: "",


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

  delay: "5",

  delayUnit: "seconds",


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

      buttonText:
        node.data?.buttonText || "",

      buttonValue:
      node.data?.buttonValue ||
      node.data?.button_value ||
      "",

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

      mediaId:
        node.data?.mediaId || "",

      imageUrl:
        node.data?.imageUrl || "",

      videoUrl:
        node.data?.videoUrl || "",

      documentUrl:
        node.data?.documentUrl || "",

      audioUrl:
        node.data?.audioUrl || "",

      mediaUrl:
        node.data?.mediaUrl || "",

      fileName:
        node.data?.fileName || "",

      caption:
        node.data?.caption || "",

      mediaType:
        node.data?.mediaType || "",


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
        node.data?.regex || "",
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

        <option value="any">
          Any Incoming Message
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

    {/* WELCOME MESSAGE */}

    {/* <div>
      <label className={labelClass}>
        Welcome Message
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
        placeholder="Welcome! How can I help you?"
        className={textareaClass}
      />

      <p className="mt-2 text-[11px] text-slate-400">
        This message will be sent when the
        workflow starts.
      </p>
    </div> */}

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
    BUTTON
====================================================== */}

{node?.type === "button" && (
  <>
    {/* Button Message */}
    <div>
      <label className={labelClass}>
        Button Message
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
        placeholder="Please select an option..."
        className={textareaClass}
      />
    </div>

    {/* Button Text */}
    <div>
      <label className={labelClass}>
        Button Text
      </label>

      <input
        type="text"
        value={form.buttonText}
        onChange={(e) =>
          updateField(
            "buttonText",
            e.target.value
          )
        }
        placeholder="Verify Mobile"
        className={inputClass}
      />
    </div>

    {/* Button Value / Handle */}
    <div>
      <label className={labelClass}>
        Button Value / Handle
      </label>

      <input
        type="text"
        value={form.buttonValue || ""}
        onChange={(e) =>
          updateField(
            "buttonValue",
            e.target.value
          )
        }
        placeholder="verify_mobile"
        className={inputClass}
      />

      <p className="mt-1 text-[11px] text-slate-500">
        Example: verify_mobile
      </p>
    </div>

    {/* Button Preview */}
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <p className="text-[10px] font-bold uppercase text-violet-500">
        Button Preview
      </p>

      <div className="mt-3 rounded-lg bg-white p-3">

        <p className="text-sm text-slate-700">
          {form.message || "Please select an option"}
        </p>

        <div className="mt-3 rounded-lg bg-violet-100 px-3 py-2 text-center text-xs font-bold text-violet-700">
          {form.buttonText || "Verify Mobile"}
        </div>

      </div>
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
                updateField(
                  "message",
                  e.target.value
                )
              }
              rows={5}
              placeholder="Please select an option:"
              className={
                textareaClass
              }
            />

            <p className="mt-2 text-[11px] text-slate-400">
              This message will be shown
              above the menu options.
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
                {form.menuOptions?.length ||
                  0}
                /10
              </span>
            </div>

            <div className="space-y-2">
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
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50
                      p-2
                    "
                  >
                    <div
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-purple-100
                        text-xs
                        font-bold
                        text-purple-600
                      "
                    >
                      {index + 1}
                    </div>

                    <input
                      type="text"
                      value={
                        option.label ||
                        ""
                      }
                      onChange={(e) =>
                        updateMenuOption(
                          index,
                          e.target.value
                        )
                      }
                      placeholder={`Option ${
                        index + 1
                      }`}
                      className="
                        min-w-0
                        flex-1
                        rounded-lg
                        border
                        border-slate-200
                        bg-white
                        px-3
                        py-2.5
                        text-sm
                        text-slate-800
                        outline-none
                        focus:border-purple-500
                        focus:ring-4
                        focus:ring-purple-500/10
                      "
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeMenuOption(
                          index
                        )
                      }
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        text-slate-400
                        transition
                        hover:bg-red-50
                        hover:text-red-500
                      "
                      title="Remove option"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              onClick={
                addMenuOption
              }
              disabled={
                (form.menuOptions || [])
                  .length >= 10
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
                border-dashed
                border-purple-300
                bg-purple-50
                px-4
                py-3
                text-xs
                font-bold
                text-purple-700
                transition
                hover:bg-purple-100
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
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
              value={
                form.validationType
              }
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
    MEDIA TEMPLATE
====================================================== */}

{node?.type === "media_template" && (
  <>
    {/* TEMPLATE NAME */}

    <div>
      <label className={labelClass}>
        Template Name
      </label>

      <input
        type="text"
        value={form.templateName || ""}
        onChange={(e) =>
          updateField(
            "templateName",
            e.target.value
          )
        }
        placeholder="welcome_customer"
        className={inputClass}
      />

      <p className="mt-2 text-[11px] text-slate-400">
        Enter the Media Template name configured
        in your WhatsApp provider.
      </p>
    </div>

    {/* TEMPLATE ID */}

    <div>
      <label className={labelClass}>
        Template ID
      </label>

      <input
        type="text"
        value={form.templateId || ""}
        onChange={(e) =>
          updateField(
            "templateId",
            e.target.value
          )
        }
        placeholder="123456"
        className={inputClass}
      />

      <p className="mt-2 text-[11px] text-slate-400">
        Provider template ID, if required.
      </p>
    </div>

    {/* LANGUAGE */}

    <div>
      <label className={labelClass}>
        Template Language
      </label>

      <select
        value={form.templateLanguage || "en"}
        onChange={(e) =>
          updateField(
            "templateLanguage",
            e.target.value
          )
        }
        className={inputClass}
      >
        <option value="en">
          English
        </option>

        <option value="hi">
          Hindi
        </option>

        <option value="en_US">
          English (US)
        </option>

        <option value="en_GB">
          English (UK)
        </option>
      </select>
    </div>

{/* =====================================================
    MEDIA TEMPLATE MEDIA UPLOAD
====================================================== */}

<div>
  <label className={labelClass}>
    Template Media
  </label>

  <div className="
    mt-2
    rounded-xl
    border
    border-dashed
    border-fuchsia-300
    bg-fuchsia-50/50
    p-4
  ">

    <label
      className={`
        flex
        cursor-pointer
        flex-col
        items-center
        justify-center
        rounded-xl
        border
        border-fuchsia-200
        bg-white
        px-4
        py-6
        text-center
        transition
        hover:border-fuchsia-400
        hover:bg-fuchsia-50
        ${
          form.templateMediaUploading
            ? "pointer-events-none opacity-60"
            : ""
        }
      `}
    >

      {form.templateMediaUploading ? (
        <>
          <Loader2
            className="
              h-8
              w-8
              animate-spin
              text-fuchsia-600
            "
          />

          <span className="
            mt-2
            text-sm
            font-semibold
            text-fuchsia-700
          ">
            Uploading...
          </span>
        </>
      ) : (
        <>
          <Upload
            className="
              h-8
              w-8
              text-fuchsia-600
            "
          />

          <span className="
            mt-2
            text-sm
            font-semibold
            text-slate-700
          ">
            Upload Media
          </span>

          <span className="
            mt-1
            text-[11px]
            text-slate-400
          ">
            Image, PDF, Document, Audio or Video
          </span>
        </>
      )}

      <input
        type="file"
        className="hidden"
        disabled={
          form.templateMediaUploading
        }
        accept="
          image/*
          ,application/pdf
          ,application/msword
          ,application/vnd.openxmlformats-officedocument.wordprocessingml.document
          ,application/vnd.ms-excel
          ,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
          ,application/vnd.ms-powerpoint
          ,application/vnd.openxmlformats-officedocument.presentationml.presentation
          ,text/plain
          ,text/csv
          ,audio/*
          ,video/*
        "
        onChange={(e) => {
          const file =
            e.target.files?.[0];

          if (file) {
            uploadTemplateMedia(file);
          }

          e.target.value = "";
        }}
      />
    </label>

    {/* =================================================
        UPLOADED MEDIA
    ================================================= */}

    {form.templateMediaUrl && (
      <div className="
        mt-3
        rounded-xl
        border
        border-slate-200
        bg-white
        p-3
      ">

        <div className="flex items-start gap-3">

          {/* PREVIEW ICON */}

          <div className="
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            overflow-hidden
            rounded-lg
            bg-fuchsia-50
          ">

            {(
              form.templateMediaType === "image" ||
              form.templateMediaType?.startsWith("image/")
            ) ? (
              <img
                src={form.templateMediaUrl}
                alt={
                  form.templateMediaName ||
                  "Uploaded media"
                }
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
            ) : form.templateMediaType === "video" ||
              form.templateMediaType?.startsWith("video/") ? (
              <Video
                className="
                  h-6
                  w-6
                  text-fuchsia-600
                "
              />
            ) : form.templateMediaType === "audio" ||
              form.templateMediaType?.startsWith("audio/") ? (
              <Volume2
                className="
                  h-6
                  w-6
                  text-fuchsia-600
                "
              />
            ) : (
              <FileText
                className="
                  h-6
                  w-6
                  text-fuchsia-600
                "
              />
            )}

          </div>

          {/* FILE INFO */}

          <div className="
            min-w-0
            flex-1
          ">

            <p className="
              truncate
              text-sm
              font-semibold
              text-slate-700
            ">
              {form.templateMediaName ||
                "Uploaded Media"}
            </p>

            <p className="
              mt-1
              text-[11px]
              text-slate-400
            ">
              Type:{" "}
              {form.templateMediaType ||
                "media"}
            </p>

            {form.templateMediaId && (
              <p className="
                mt-1
                text-[10px]
                text-slate-400
              ">
                Media ID:{" "}
                {form.templateMediaId}
              </p>
            )}

            <p className="
              mt-1
              truncate
              text-[10px]
              text-slate-400
            ">
              {form.templateMediaUrl}
            </p>

          </div>

          {/* REMOVE */}

          <button
            type="button"
            onClick={() => {
              setForm((previous) => ({
                ...previous,

                templateMediaId: "",
                templateMediaUrl: "",
                templateImageUrl: "",
                templateMediaName: "",
                templateMediaType: "",
              }));
            }}
            className="
              rounded-lg
              p-2
              text-slate-400
              transition
              hover:bg-red-50
              hover:text-red-500
            "
            title="Remove media"
          >
            <X className="h-4 w-4" />
          </button>

        </div>

      </div>
    )}

  </div>

  <p className="
    mt-2
    text-[11px]
    text-slate-400
  ">
    Maximum file size: 50 MB.
    Supported: Image, PDF, Document, Audio and Video.
  </p>
</div>

    {/* =====================================================
        MEDIA URL
    ===================================================== */}
<div>
  <label className={labelClass}>
    Template Media URL
  </label>

  <input
    type="url"
    value={
      form.templateMediaUrl ||
      form.templateImageUrl ||
      ""
    }
    onChange={(e) => {
      const url =
        e.target.value;

      const detectedType =
        detectTemplateMediaTypeFromUrl(
          url
        );

      setForm((previous) => ({
        ...previous,

        templateMediaUrl:
          url,

        // backward compatibility
        templateImageUrl:
          url,

        ...(detectedType
          ? {
              templateMediaType:
                detectedType,
            }
          : {}),
      }));
    }}
    placeholder="https://example.com/media.jpg"
    className={inputClass}
  />

  <p className="
    mt-2
    text-[11px]
    text-slate-400
  ">
    Upload a file above or enter a public HTTPS
    URL manually.
  </p>
</div>

    {/* =====================================================
        BODY
    ===================================================== */}

    <div>
      <label className={labelClass}>
        Template Body / Caption
      </label>

      <textarea
        value={form.templateBody || ""}
        onChange={(e) =>
          updateField(
            "templateBody",
            e.target.value
          )
        }
        rows={6}
        placeholder="Hello {{1}}, welcome to our store!"
        className={textareaClass}
      />

      <p className="mt-2 text-[11px] text-slate-400">
        Enter the body/caption configured for
        your Media Template.
      </p>
    </div>

{/* =====================================================
    PREVIEW
===================================================== */}

<div className="
  rounded-xl
  border
  border-fuchsia-200
  bg-fuchsia-50
  p-4
">

  <div className="flex items-center gap-2">

    <ImageIcon
      className="
        h-4
        w-4
        text-fuchsia-600
      "
    />

    <p className="
      text-[10px]
      font-bold
      uppercase
      tracking-wide
      text-fuchsia-600
    ">
      Media Template Preview
    </p>

  </div>

  <div className="
    mt-3
    overflow-hidden
    rounded-xl
    bg-white
    shadow-sm
  ">

    {/* IMAGE */}

    {form.templateMediaUrl &&
    (
      form.templateMediaType === "image" ||
      form.templateMediaType?.startsWith(
        "image/"
      )
    ) ? (

      <img
        src={form.templateMediaUrl}
        alt={
          form.templateMediaName ||
          "Template media"
        }
        className="
          h-40
          w-full
          object-cover
        "
        onError={(e) => {
          e.currentTarget.style.display =
            "none";
        }}
      />

    ) : form.templateMediaUrl &&
      (
        form.templateMediaType === "video" ||
        form.templateMediaType?.startsWith(
          "video/"
        )
      ) ? (

      <div className="bg-black p-2">

        <video
          src={form.templateMediaUrl}
          controls
          className="
            max-h-60
            w-full
            rounded-lg
          "
        />

      </div>

    ) : form.templateMediaUrl &&
      (
        form.templateMediaType === "audio" ||
        form.templateMediaType?.startsWith(
          "audio/"
        )
      ) ? (

      <div className="
        flex
        flex-col
        items-center
        justify-center
        bg-amber-50
        p-6
      ">

        <Volume2
          className="
            h-10
            w-10
            text-amber-500
          "
        />

        <p className="
          mt-2
          text-xs
          font-semibold
          text-slate-700
        ">
          {form.templateMediaName ||
            "Audio File"}
        </p>

        <audio
          src={form.templateMediaUrl}
          controls
          className="mt-3 w-full"
        />

      </div>

    ) : form.templateMediaUrl ? (

      <div className="
        flex
        flex-col
        items-center
        justify-center
        bg-slate-100
        p-6
      ">

        <FileText
          className="
            h-10
            w-10
            text-fuchsia-500
          "
        />

        <span className="
          mt-2
          text-xs
          font-semibold
          text-slate-700
        ">
          {form.templateMediaName ||
            "Uploaded Media"}
        </span>

        <span className="
          mt-1
          text-[10px]
          uppercase
          text-slate-400
        ">
          {form.templateMediaType ||
            "document"}
        </span>

        <a
          href={form.templateMediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="
            mt-3
            rounded-lg
            bg-fuchsia-100
            px-3
            py-2
            text-[11px]
            font-bold
            text-fuchsia-700
            hover:bg-fuchsia-200
          "
        >
          Open Media
        </a>

      </div>

    ) : (

      <div className="
        flex
        h-32
        items-center
        justify-center
        bg-slate-100
      ">

        <ImageIcon
          className="
            h-8
            w-8
            text-slate-300
          "
        />

      </div>

    )}

    {/* BODY */}

    <div className="p-4">

      <p className="
        whitespace-pre-wrap
        text-sm
        leading-5
        text-slate-700
      ">
        {form.templateBody ||
          "Template body / caption will appear here."}
      </p>

    </div>

  </div>
</div>
    {/* =====================================================
        CONFIGURATION INFO
    ===================================================== */}

    <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4">

      <p className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-600">
        Template Configuration
      </p>

      <div className="mt-3 space-y-2 text-xs">

        <div className="flex justify-between gap-3">

          <span className="text-slate-500">
            Name
          </span>

          <span className="truncate font-bold text-slate-700">
            {form.templateName ||
              "Not configured"}
          </span>

        </div>

        <div className="flex justify-between gap-3">

          <span className="text-slate-500">
            ID
          </span>

          <span className="truncate font-bold text-slate-700">
            {form.templateId ||
              "Not configured"}
          </span>

        </div>

        <div className="flex justify-between gap-3">

          <span className="text-slate-500">
            Language
          </span>

          <span className="font-bold uppercase text-slate-700">
            {form.templateLanguage ||
              "en"}
          </span>

        </div>

        <div className="flex justify-between gap-3">

          <span className="text-slate-500">
            Media
          </span>

          <span className="max-w-[60%] truncate font-bold text-slate-700">
            {form.templateMediaName ||
              "Not uploaded"}
          </span>

        </div>

      </div>
    </div>
  </>
)}

      {/* =====================================================
          VIDEO
      ====================================================== */}

      {/* {node?.type === "video" && (
        <>
          {renderUploadBox(
            "video",
            "video/mp4,video/3gpp,video/quicktime,video/webm",
            "Upload Video"
          )}

          <div>
            <label className={labelClass}>
              Video URL
            </label>

            <input
              type="url"
              value={
                form.videoUrl
              }
              onChange={(e) =>
                updateMediaUrl(
                  "videoUrl",
                  e.target.value,
                  "video"
                )
              }
              placeholder="https://example.com/video.mp4"
              className={inputClass}
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Upload a video above or enter a public HTTPS URL.
            </p>
          </div>

          <div>
            <label className={labelClass}>
              Caption
            </label>

            <textarea
              value={form.caption}
              onChange={(e) =>
                updateField(
                  "caption",
                  e.target.value
                )
              }
              rows={4}
              placeholder="Enter video caption..."
              className={
                textareaClass
              }
            />
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-[10px] font-bold uppercase text-blue-500">
              Video
            </p>

            <p className="mt-2 truncate text-xs text-slate-600">
              {form.videoUrl ||
                "No video configured"}
            </p>

            {form.fileName && (
              <p className="mt-1 truncate text-xs font-semibold text-blue-700">
                {form.fileName}
              </p>
            )}
          </div>
        </>
      )} */}

      {/* =====================================================
          DOCUMENT
      ====================================================== */}

      {/* {node?.type === "document" && (
        <>
          {renderUploadBox(
            "document",
            ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv",
            "Upload Document"
          )}

          <div>
            <label className={labelClass}>
              Document URL
            </label>

            <input
              type="url"
              value={
                form.documentUrl
              }
              onChange={(e) =>
                updateMediaUrl(
                  "documentUrl",
                  e.target.value,
                  "document"
                )
              }
              placeholder="https://example.com/document.pdf"
              className={inputClass}
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Upload a document above or enter a public HTTPS URL.
            </p>
          </div>

          <div>
            <label className={labelClass}>
              File Name
            </label>

            <input
              type="text"
              value={form.fileName}
              onChange={(e) =>
                updateField(
                  "fileName",
                  e.target.value
                )
              }
              placeholder="brochure.pdf"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Caption
            </label>

            <textarea
              value={form.caption}
              onChange={(e) =>
                updateField(
                  "caption",
                  e.target.value
                )
              }
              rows={4}
              placeholder="Enter document caption..."
              className={
                textareaClass
              }
            />
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-[10px] font-bold uppercase text-indigo-500">
              Document
            </p>

            <p className="mt-2 truncate text-xs text-slate-600">
              {form.documentUrl ||
                "No document configured"}
            </p>

            {form.fileName && (
              <p className="mt-1 truncate text-xs font-semibold text-indigo-700">
                {form.fileName}
              </p>
            )}
          </div>
        </>
      )} */}

      {/* =====================================================
          PDF
      ====================================================== */}

      {/* {node?.type === "pdf" && (
        <>
          {renderUploadBox(
            "pdf",
            "application/pdf",
            "Upload PDF"
          )}

          <div>
            <label className={labelClass}>
              PDF URL
            </label>

            <input
              type="url"
              value={
                form.documentUrl
              }
              onChange={(e) =>
                updateMediaUrl(
                  "documentUrl",
                  e.target.value,
                  "pdf"
                )
              }
              placeholder="https://example.com/brochure.pdf"
              className={inputClass}
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Upload a PDF above or enter a public HTTPS URL.
            </p>
          </div>

          <div>
            <label className={labelClass}>
              File Name
            </label>

            <input
              type="text"
              value={form.fileName}
              onChange={(e) =>
                updateField(
                  "fileName",
                  e.target.value
                )
              }
              placeholder="brochure.pdf"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Caption
            </label>

            <textarea
              value={form.caption}
              onChange={(e) =>
                updateField(
                  "caption",
                  e.target.value
                )
              }
              rows={4}
              placeholder="Enter PDF caption..."
              className={
                textareaClass
              }
            />
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-[10px] font-bold uppercase text-red-500">
              PDF Document
            </p>

            <p className="mt-2 truncate text-xs text-slate-600">
              {form.documentUrl ||
                "No PDF configured"}
            </p>

            {form.fileName && (
              <p className="mt-1 truncate text-xs font-semibold text-red-700">
                {form.fileName}
              </p>
            )}
          </div>
        </>
      )}

      {/* =====================================================
          AUDIO
      ====================================================== */}

      {/* {node?.type === "audio" && (
        <>
          {renderUploadBox(
            "audio",
            ".mp3,.wav,.ogg,.aac,.m4a,.mp4",
            "Upload Audio"
          )}

          <div>
            <label className={labelClass}>
              Audio URL
            </label>

            <input
              type="url"
              value={
                form.audioUrl
              }
              onChange={(e) =>
                updateMediaUrl(
                  "audioUrl",
                  e.target.value,
                  "audio"
                )
              }
              placeholder="https://example.com/audio.mp3"
              className={inputClass}
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Upload an audio file above or enter a public HTTPS URL.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-bold uppercase text-amber-500">
              Audio
            </p>

            <p className="mt-2 truncate text-xs text-slate-600">
              {form.audioUrl ||
                "No audio configured"}
            </p>

            {form.fileName && (
              <p className="mt-1 truncate text-xs font-semibold text-amber-700">
                {form.fileName}
              </p>
            )}
          </div>
        </>
      )} */}

      {/* =====================================================
          DELAY
      ====================================================== */}

      {node?.type === "delay" && (
        <>
          <div>
            <label className={labelClass}>
              Delay
            </label>

            <input
              type="number"
              min="1"
              value={form.delay}
              onChange={(e) =>
                updateField(
                  "delay",
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Delay Unit
            </label>

            <select
              value={
                form.delayUnit
              }
              onChange={(e) =>
                updateField(
                  "delayUnit",
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="seconds">
                Seconds
              </option>

              <option value="minutes">
                Minutes
              </option>

              <option value="hours">
                Hours
              </option>

              <option value="days">
                Days
              </option>
            </select>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-[10px] font-bold uppercase text-orange-500">
              Wait Time
            </p>

            <p className="mt-2 text-lg font-bold text-orange-700">
              {form.delay}{" "}
              {form.delayUnit}
            </p>
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
            bg-indigo-600
            px-5
            py-3.5
            text-sm
            font-bold
            text-white
            shadow-md
            shadow-indigo-500/20
            transition
            hover:bg-indigo-700
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

const Home = () => {

    const navigate = useNavigate();
     /* =======================================================
     AUTH
  ======================================================= */

  const [token, setToken] =
    useState(
      localStorage.getItem(
        "token"
      ) || ""
    );

  const [login, setLogin] =
    useState({
      email:
        "",
      password:
        "",
    });

  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false);

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
      "New WhatsApp Workflow"
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
                        ? "Please choose an option."
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
                        ? "Verify Mobile"
                        : "",

                    buttonValue:
                    type === "button"
                      ? "verify_mobile"
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

                delay: "5",

                delayUnit: "seconds",
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
     LOAD WORKFLOWS
  ======================================================= */

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadWorkflows =
      async () => {
        try {
          setLoadingWorkflows(
            true
          );

          const response =
            await axios.get(
              API +
                "/workflows",
              {
                headers: {
                  Authorization:
                    "Bearer " +
                    token,
                },
              }
            );

          const list =
            response.data?.data ||
            [];

          setWorkflows(
            Array.isArray(list)
              ? list
              : []
          );
        } catch (error) {
          console.error(
            "WORKFLOW LIST ERROR:",
            error
          );

          toast.error(
            error?.response
              ?.data?.message ||
              "Unable to load workflows."
          );
        } finally {
          setLoadingWorkflows(
            false
          );
        }
      };

    loadWorkflows();
  }, [token]);

  /* =======================================================
     SELECT WORKFLOW
  ======================================================= */

  const selectWorkflow =
    (id) => {
      if (!id) {
        return;
      }

      localStorage.setItem(
        "workflow_id",
        String(id)
      );

      setWorkflowId(
        String(id)
      );

      historyReady.current =
        false;

      setHistory([]);
      setFuture([]);

      setNodes([]);
      setEdges([]);

      setSelected(null);
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

      setName(
        "New WhatsApp Workflow"
      );

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
      !workflowId
    ) {
      return;
    }

    const loadWorkflow =
      async () => {
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
          }, 100);
        } catch (error) {
          console.error(
            "WORKFLOW LOAD ERROR:",
            error
          );

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
    setNodes,
    setEdges,
  ]);

  /* =======================================================
     LOGIN
  ======================================================= */

  const doLogin =
    async () => {
      if (
        !login.email ||
        !login.password
      ) {
        toast.warning(
          "Please enter email and password."
        );

        return;
      }

      setLoginLoading(
        true
      );

      try {
        const response =
          await axios.post(
            API + "/login",
            login
          );

        const newToken =
          response.data?.token;

        if (!newToken) {
          toast.error(
            "Login token not received."
          );

          return;
        }

        localStorage.setItem(
          "token",
          newToken
        );

        setToken(
          newToken
        );

        toast.success(
          "Login successful."
        );
      } catch (error) {
        console.error(
          error
        );

        toast.error(
          error?.response
            ?.data?.message ||
            "Login failed"
        );
      } finally {
        setLoginLoading(
          false
        );
      }
    };

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
    toast.warning(
      "Please login first."
    );

    return;
  }

  if (!name.trim()) {
    toast.warning(
      "Please enter workflow name."
    );

    return;
  }

  setSaving(true);

  try {
    const headers = {
      Authorization:
        "Bearer " + token,
    };

    let id = workflowId;

    /* ===============================================
       CREATE WORKFLOW
    =============================================== */

    if (!id) {
      const response =
        await axios.post(
          API + "/workflows",

          {
            name,

            channel:
              "whatsapp",
          },

          {
            headers,
          }
        );

      id =
        response.data?.id ||
        response.data?.data?.id;

      if (!id) {
        throw new Error(
          "Workflow ID was not returned."
        );
      }

      setWorkflowId(
        String(id)
      );

      localStorage.setItem(
        "workflow_id",
        String(id)
      );

      const createdWorkflow =
        response.data?.data ||
        response.data;

      setWorkflows(
        (current) => [
          createdWorkflow,
          ...current,
        ]
      );
    }

    /* ===============================================
       PREPARE EDGES
       KEEP EXACT SOURCE/TARGET HANDLES
    =============================================== */

    const edgesToSave =
      edges.map((edge) => ({
        ...edge,

        /*
         * Main Menu option handle
         *
         * Example:
         * source-option-0
         * source-option-1
         * source-option-2
         */
        sourceHandle:
          edge.sourceHandle ||
          null,

        /*
         * Target node handle
         *
         * Example:
         * target-top
         * target-left
         * target-right
         * target-bottom
         */
        targetHandle:
          edge.targetHandle ||
          null,

        /*
         * Keep edge type
         */
        type:
          edge.type ||
          "smoothstep",

        /*
         * Keep label
         */
        label:
          edge.label ||
          null,
      }));

    /* ===============================================
       UPDATE WORKFLOW
    =============================================== */

    await axios.put(
      API + "/workflows/" + id,

      {
        name,

        nodes,

        edges:
          edgesToSave,
      },

      {
        headers,
      }
    );

    /* ===============================================
       UPDATE DROPDOWN
    =============================================== */

    setWorkflows(
      (current) =>
        current.map(
          (workflow) =>
            String(
              workflow.id
            ) ===
            String(id)
              ? {
                  ...workflow,
                  name,
                }
              : workflow
        )
    );

    /* ===============================================
       PUBLISH
    =============================================== */

    if (publish) {
      await axios.post(
        API +
          "/workflows/" +
          id +
          "/publish",

        {},

        {
          headers,
        }
      );
    }

    /* ===============================================
       SUCCESS
    =============================================== */

    toast.success(
      publish
        ? "Workflow published successfully."
        : "Workflow saved successfully."
    );

  } catch (error) {
    console.error(
      "WORKFLOW ERROR:",
      error
    );

    toast.error(
      error?.response
        ?.data?.message ||
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

        /* =============================================
           DELETE
        ============================================== */

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

  /* =======================================================
     LOGIN SCREEN
  ======================================================= */

  if (!token) {
    return (
      <>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="light"
        />

        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/20">
                WF
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                Workflow Builder
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Build powerful
                WhatsApp automation
                workflows.
              </p>
            </div>

            <div className="space-y-5">
              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>

                <input
                  value={
                    login.email
                  }
                  onChange={(e) =>
                    setLogin({
                      ...login,
                      email:
                        e.target.value,
                    })
                  }
                  placeholder="Enter email"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-indigo-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-indigo-500/10
                  "
                />
              </div>

              {/* PASSWORD */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>

                <input
                  type="password"
                  value={
                    login.password
                  }
                  onChange={(e) =>
                    setLogin({
                      ...login,
                      password:
                        e.target.value,
                    })
                  }
                  placeholder="Enter password"
                  onKeyDown={(e) => {
                    if (
                      e.key ===
                      "Enter"
                    ) {
                      doLogin();
                    }
                  }}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-indigo-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-indigo-500/10
                  "
                />
              </div>

              {/* LOGIN */}

              <button
                onClick={
                  doLogin
                }
                disabled={
                  loginLoading
                }
                className="
                  w-full
                  rounded-xl
                  bg-indigo-600
                  px-5
                  py-3.5
                  text-sm
                  font-bold
                  text-white
                  shadow-lg
                  shadow-indigo-500/20
                  transition
                  hover:bg-indigo-700
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {loginLoading
                  ? "Signing in..."
                  : "Sign In"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <>

    <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />

      <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
        {/* =================================================
            HEADER
        ================================================= */}

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
            {/* LOGO */}

            <div
              className="
                hidden
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-indigo-600
                font-bold
                text-white
                shadow-sm
                sm:flex
              "
            >
              <WorkflowIcon className="h-5 w-5" />
            </div>

            {/* TITLE */}

            <div className="hidden min-w-0 sm:block">
              <h1 className="truncate text-sm font-bold text-slate-900 md:text-base">
              Workflow
                Builder
              </h1>

              <p className="hidden text-xs text-slate-400 md:block">
                Automation workspace
              </p>
            </div>

            {/* WORKFLOW SELECT */}

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={
                    workflowId ||
                    ""
                  }
                  onChange={(e) => {
                    const id =
                      e.target.value;

                    if (!id) {
                      return;
                    }

                    selectWorkflow(
                      id
                    );
                  }}
                  className="
                    h-10
                    w-[220px]
                    appearance-none
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    pl-4
                    pr-10
                    text-sm
                    font-semibold
                    text-slate-700
                    shadow-sm
                    outline-none
                    transition
                    hover:border-indigo-300
                    focus:border-indigo-500
                    focus:ring-4
                    focus:ring-indigo-500/10
                    md:w-[200px]
                  "
                >
                  <option
                    value=""
                    disabled
                  >
                    {loadingWorkflows
                      ? "Loading workflows..."
                      : "Select Workflow"}
                  </option>

                  {workflows.map(
                    (
                      workflow
                    ) => (
                      <option
                        key={
                          workflow.id
                        }
                        value={
                          workflow.id
                        }
                      >
                        {
                          workflow.name
                        }
                      </option>
                    )
                  )}
                </select>

                <div
                  className="
                    pointer-events-none
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                >
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>

              {/* NEW WORKFLOW */}

              <button
                type="button"
                onClick={
                  newWorkflow
                }
                className="
                  hidden
                  h-10
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-indigo-200
                  bg-indigo-50
                  px-4
                  text-sm
                  font-bold
                  text-indigo-700
                  transition
                  hover:bg-indigo-100
                  md:flex
                "
              >
                <Plus className="h-4 w-4" />

                New Workflow
              </button>
            </div>

           

            {/* NAME */}

            <input
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
            />

             {/* SIMULATOR */}

                <button
                type="button"
                onClick={() => navigate("/whatsapp-simulator")}
                className="
                    hidden
                    h-10
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-violet-200
                    bg-violet-50
                    px-4
                    text-sm
                    font-bold
                    text-violet-700
                    transition
                    hover:bg-violet-100
                    md:flex
                "
                >
                <Play className="h-4 w-4" />

                Simulator
                </button>

          </div>

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

          {/* ACTIONS */}

          <div className="flex items-center gap-2">
            {/* SAVE */}

            <button
              onClick={() =>
                save(false)
              }
              disabled={saving}
              className="
                flex
                items-center
                gap-2
                rounded-lg
                border
                border-slate-200
                bg-white
                px-3
                py-2
                text-sm
                font-semibold
                text-slate-700
                shadow-sm
                transition
                hover:bg-slate-50
                disabled:opacity-50
                md:px-4
              "
            >
              <Save className="h-4 w-4" />

              {saving
                ? "Saving..."
                : "Save"}
            </button>

            {/* PUBLISH */}

            <button
              onClick={() =>
                save(true)
              }
              disabled={saving}
              className="
                flex
                items-center
                gap-2
                rounded-lg
                bg-indigo-600
                px-3
                py-2
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-indigo-700
                disabled:opacity-50
                md:px-4
              "
            >
              <Send className="h-4 w-4" />

              Publish
            </button>

            {/* LOGOUT */}

            <button
              onClick={() => {
                localStorage.removeItem(
                  "token"
                );

                setToken("");
              }}
              className="
                hidden
                items-center
                gap-2
                rounded-lg
                border
                border-slate-200
                bg-white
                px-4
                py-2
                text-sm
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
                sm:flex
              "
            >
              <LogOut className="h-4 w-4" />

              Logout
            </button>
          </div>
        </header>

        {/* =================================================
            MOBILE WORKFLOW
        ================================================= */}

        <div className="border-b border-slate-200 bg-white p-3 md:hidden">
          <div className="flex gap-2">
            <select
              value={
                workflowId ||
                ""
              }
              onChange={(e) =>
                selectWorkflow(
                  e.target.value
                )
              }
              className="
                min-w-0
                flex-1
                rounded-lg
                border
                border-slate-200
                bg-slate-50
                px-3
                py-2
                text-sm
                font-semibold
                outline-none
                focus:border-indigo-500
              "
            >
              <option
                value=""
                disabled
              >
                Select Workflow
              </option>

              {workflows.map(
                (workflow) => (
                  <option
                    key={
                      workflow.id
                    }
                    value={
                      workflow.id
                    }
                  >
                    {
                      workflow.name
                    }
                  </option>
                )
              )}
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
                ref={reactFlowWrapper}

                nodes={nodes.map((node) => ({
                    ...node,

                    selected:
                        selected?.id === node.id,

                  data: {
                ...node.data,

                // onDelete: () => {
                //     deleteNode(node.id);
                // },
            },
                }))}

                edges={edges}

                /* =================================================
                REACT FLOW INSTANCE
                ================================================= */

                onInit={setReactFlowInstance}

                /* =================================================
                DRAG & DROP
                ================================================= */

                onDrop={onDrop}

                onDragOver={onDragOver}



                        onNodesChange={
                            handleNodesChange
                        }

                        onEdgesChange={
                            handleEdgesChange
                        }

                        onConnect={
                            onConnect
                        }

                        onReconnect={
                            onReconnect
                        }

                        edgesReconnectable={
                            true
                        }

                        onNodeDragStart={
                            handleNodeDragStart
                        }

                        onNodeClick={(
                            _event,
                            node
                        ) =>
                            setSelected(
                            node
                            )
                        }

                        onPaneClick={() =>
                            setSelected(
                            null
                            )
                        }

                        nodeTypes={
                            nodeTypes
                        }

                        defaultViewport={{
                            x: 80,
                            y: 80,
                            zoom: 0.65,
                        }}

                        minZoom={0.4}

                        maxZoom={1.5}

                        fitView={false}

                        proOptions={{
                            hideAttribution:
                            true,
                        }}
                        >
                        <MiniMap
                            nodeStrokeWidth={
                            3
                            }
                            pannable
                            zoomable
                        />

                        <Controls />

                        <Background
                            gap={20}
                            size={1}
                        />
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
                <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-600">
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
        </main>
      </div>
    
    </>
  )
}

export default Home
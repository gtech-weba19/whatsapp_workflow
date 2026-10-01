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
  useReactFlow
} from "reactflow";

import "reactflow/dist/style.css";
import "react-toastify/dist/ReactToastify.css";

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

   const { deleteElements } = useReactFlow();

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();

    deleteElements({
      nodes: [
        {
          id: String(id),
        },
      ],
    });
  };

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
    data.message ||
    data.variable ||
    data.condition ||
    data.apiUrl ||
    data.imageUrl ||
    data.caption ||
    data.delay
      ? data.message ||
        data.variable ||
        data.condition ||
        data.apiUrl ||
        data.imageUrl ||
        data.caption ||
        `${data.delay || ""} ${
          data.delayUnit || ""
        }`
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
     onClick={handleDelete}
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
            <Globe className="h-5 w-5" />
          ) : type === "image" ? (
            <ImageIcon className="h-5 w-5" />
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

const ConditionNode = (props) => (
  <Node {...props} type="condition" />
);

const ApiNode = (props) => (
  <Node {...props} type="api" />
);

const ImageNode = (props) => (
    <Node {...props} type="image" />
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


/* =========================================================
   NODE TYPES
========================================================= */

const nodeTypes = {
    start: StartNode,
    message: MessageNode,
    button: ButtonNode,
    menu: MenuNode,
    userInput: UserInputNode,
    condition: ConditionNode,
    api: ApiNode,

    image: ImageNode,
    video: VideoNode,
    document: DocumentNode,
    pdf: PdfNode,
    audio: AudioNode,

    delay: DelayNode,
    end: EndNode,
};

/* =========================================================
   PALETTE
========================================================= */

const palette = [
  ["start", "Start"],
  ["message", "Message"],
  ["button", "Button"],
  ["menu", "Main Menu"],
  ["userInput", "User Input"],
  ["condition", "Condition"],
  ["api", "API"],
  ["image", "Image"],
  ["video", "Video"],
  ["document", "Document"],
  ["pdf", "PDF"],
  ["audio", "Audio"],
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
  api: Globe,
  image: ImageIcon,
  video: Video,
  document: FileText,
  pdf: FileText,
  audio: Volume2,
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
  label: "",

  // =====================================================
  // START TRIGGER
  // =====================================================
  triggerText: "",

  // =====================================================
  // COMMON
  // =====================================================
  message: "",
  variable: "",
  buttonText: "",
  condition: "",
  apiUrl: "",
  method: "GET",

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

  delay: "5",
  delayUnit: "seconds",

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
});

  // =======================================================
  // UPLOAD STATE
  // =======================================================

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
  // ===================================================
  // COMMON
  // ===================================================

  label:
    node.data?.label || "",

  // ===================================================
  // START TRIGGER
  // ===================================================

  triggerText:
    node.data?.triggerText ||
    node.data?.trigger_text ||
    "",

  message:
    node.data?.message || "",

  variable:
    node.data?.variable || "",

  buttonText:
    node.data?.buttonText || "",

  condition:
    node.data?.condition || "",

  apiUrl:
    node.data?.apiUrl || "",

  method:
    node.data?.method || "GET",

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
  // MEDIA UPLOAD
  // =======================================================

  const uploadMedia = async (
    file,
    mediaType
  ) => {
    if (!file) {
      return;
    }

    // =====================================================
    // MAX 50 MB
    // =====================================================

    const maxSize =
      50 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error(
        "Maximum file size is 50 MB."
      );

      return;
    }

    try {
      setUploadingMedia(
        mediaType
      );

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
          workflowId
        );
      }

      // ===================================================
      // API CALL
      // ===================================================

  const response = await axios.post(
  `${API}/upload/media`,
  formData,
  {
    headers: {
      Accept: "application/json",

      ...(localStorage.getItem("token")
        ? {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
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
      // COMMON MEDIA DATA
      // ===================================================

      const uploadedUrl =
        media.url;

      const uploadedFileName =
        media.original_name ||
        media.file_name ||
        file.name;

      setForm((previous) => ({
        ...previous,

        mediaId:
          media.id || "",

        mediaUrl:
          uploadedUrl,

        mediaType:
          media.media_type ||
          mediaType,

        fileName:
          uploadedFileName,

        // ===============================================
        // MEDIA SPECIFIC URL
        // ===============================================

        imageUrl:
          mediaType === "image"
            ? uploadedUrl
            : previous.imageUrl,

        videoUrl:
          mediaType === "video"
            ? uploadedUrl
            : previous.videoUrl,

        documentUrl:
          mediaType === "document" ||
          mediaType === "pdf"
            ? uploadedUrl
            : previous.documentUrl,

        audioUrl:
          mediaType === "audio"
            ? uploadedUrl
            : previous.audioUrl,
      }));

      toast.success(
        `${mediaType.toUpperCase()} uploaded successfully.`
      );
    } catch (error) {
      console.error(
        "MEDIA UPLOAD ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Media upload failed."
      );
    } finally {
      setUploadingMedia("");
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
  // START TRIGGER
  // =================================================

  triggerText:
    node.type === "start"
      ? String(
          form.triggerText || ""
        ).trim()
      : node.data?.triggerText || "",

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

    setSelected(
      updatedNode
    );

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
  <div className="space-y-4">

    {/* ================================================
        TRIGGER MESSAGE
    ================================================ */}

    <div>
      <label className={labelClass}>
        Trigger Message
      </label>

      <input
        type="text"
        value={form.triggerText || ""}
        onChange={(e) =>
          updateField(
            "triggerText",
            e.target.value
          )
        }
        placeholder="hi"
        className={inputClass}
      />

      <p className="mt-2 text-[11px] leading-5 text-slate-400">
        When the customer sends this message,
        the workflow will start.
      </p>
    </div>

    {/* ================================================
        TRIGGER PREVIEW
    ================================================ */}

    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">

      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
        Start Trigger
      </p>

      <div className="mt-3 rounded-lg border border-emerald-100 bg-white px-3 py-3">

        <p className="text-xs text-slate-400">
          Customer message
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-700">
          {form.triggerText || "hi"}
        </p>

      </div>

    </div>

    {/* ================================================
        INFO
    ================================================ */}

    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">

      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
        How it works
      </p>

      <p className="mt-2 text-xs leading-5 text-blue-700">
        The Start Node only detects the trigger
        message. Add a separate Message Node after
        Start if you want to send a welcome message.
      </p>

    </div>

  </div>
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
              className={
                textareaClass
              }
            />
          </div>

          <div>
            <label className={labelClass}>
              Button Text
            </label>

            <input
              type="text"
              value={
                form.buttonText
              }
              onChange={(e) =>
                updateField(
                  "buttonText",
                  e.target.value
                )
              }
              placeholder="Continue"
              className={inputClass}
            />
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-[10px] font-bold uppercase text-violet-500">
              Button Preview
            </p>

            <div className="mt-3 rounded-lg bg-white p-3">
              <p className="text-sm text-slate-700">
                {form.message ||
                  "Please select an option"}
              </p>

              <div className="mt-3 rounded-lg bg-violet-100 px-3 py-2 text-center text-xs font-bold text-violet-700">
                {form.buttonText ||
                  "Continue"}
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

      {/* =====================================================
          CONDITION
      ====================================================== */}

      {node?.type === "condition" && (
        <>
          <div>
            <label className={labelClass}>
              Condition
            </label>

            <textarea
              value={
                form.condition
              }
              onChange={(e) =>
                updateField(
                  "condition",
                  e.target.value
                )
              }
              rows={4}
              placeholder="customer.points > 100"
              className={
                textareaClass
              }
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Example:
              customer.points &gt;
              100
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-bold uppercase text-amber-500">
              Condition
            </p>

            <p className="mt-2 text-sm font-semibold text-amber-700">
              {form.condition ||
                "No condition configured"}
            </p>
          </div>
        </>
      )}

      {/* =====================================================
          API
      ====================================================== */}

      {node?.type === "api" && (
        <>
          <div>
            <label className={labelClass}>
              HTTP Method
            </label>

            <select
              value={form.method}
              onChange={(e) =>
                updateField(
                  "method",
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

              <option value="DELETE">
                DELETE
              </option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              API URL
            </label>

            <input
              type="url"
              value={form.apiUrl}
              onChange={(e) =>
                updateField(
                  "apiUrl",
                  e.target.value
                )
              }
              placeholder="https://example.com/api"
              className={inputClass}
            />
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-[10px] font-bold uppercase text-blue-500">
              API Request
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-md bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
                {form.method}
              </span>

              <span className="truncate text-xs text-slate-600">
                {form.apiUrl ||
                  "API URL"}
              </span>
            </div>
          </div>
        </>
      )}

      {/* =====================================================
          IMAGE
      ====================================================== */}

      {node?.type === "image" && (
        <>
          {renderUploadBox(
            "image",
            "image/jpeg,image/png,image/webp,image/gif",
            "Upload Image"
          )}

          <div>
            <label className={labelClass}>
              Image URL
            </label>

            <input
              type="url"
              value={
                form.imageUrl
              }
              onChange={(e) =>
                updateMediaUrl(
                  "imageUrl",
                  e.target.value,
                  "image"
                )
              }
              placeholder="https://example.com/image.jpg"
              className={inputClass}
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Upload a file above or enter a public HTTPS URL.
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
              placeholder="Enter image caption..."
              className={
                textareaClass
              }
            />
          </div>

          <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
            <p className="text-[10px] font-bold uppercase text-pink-500">
              Image
            </p>

            <p className="mt-2 truncate text-xs text-slate-600">
              {form.imageUrl ||
                "No image configured"}
            </p>

            {form.fileName && (
              <p className="mt-1 truncate text-xs font-semibold text-pink-700">
                {form.fileName}
              </p>
            )}
          </div>
        </>
      )}

      {/* =====================================================
          VIDEO
      ====================================================== */}

      {node?.type === "video" && (
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
      )}

      {/* =====================================================
          DOCUMENT
      ====================================================== */}

      {node?.type === "document" && (
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
      )}

      {/* =====================================================
          PDF
      ====================================================== */}

      {node?.type === "pdf" && (
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

      {node?.type === "audio" && (
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
      )}

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

                /* =============================================
                   BUTTON
                ============================================== */

                buttonText:
                    type === "button"
                        ? "Continue"
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

  const addNode =
    (type) => {
      const id =
        type +
        "-" +
        Date.now();

      const menuOptions =
        type === "menu"
          ? defaultMenuOptions.map(
              (option, index) => ({
                id:
                  option.id ||
                  `option-${
                    index + 1
                  }`,

                label:
                  option.label,
              })
            )
          : [];

      const newNode = {
        id,

        type,

        position: {
          x:
            300 +
            Math.random() *
              350,

          y:
            100 +
            Math.random() *
              400,
        },

        data: {
          label:
            palette.find(
              (item) =>
                item[0] ===
                type
            )?.[1] ||
            type,

          message:
            type ===
            "message"
              ? "Hello! Welcome."
              : type ===
                "button"
              ? "Please choose an option."
              : type ===
                "menu"
              ? "Please select an option:"
              : type ===
                "userInput"
              ? "What is your name?"
              : "",

          variable:
            type ===
            "userInput"
              ? "customer_name"
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

          buttonText:
            type === "button"
              ? "Continue"
              : "",

          menuOptions,

          condition:
            type ===
            "condition"
              ? "customer.points > 100"
              : "",

          method:
            "GET",

          apiUrl:
            "",

          imageUrl:
            "",

          caption:
            "",

          delay:
            "5",

          delayUnit:
            "seconds",
        },
      };

      pushHistory(
        nodes,
        edges
      );

      setNodes(
        (existingNodes) =>
          existingNodes.concat(
            newNode
          )
      );

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
  /* =======================================================
     SAVE
  ======================================================= */

/* =======================================================
   SAVE
======================================================= */

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
                    md:w-[260px]
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
        selected: selected?.id === node.id,
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

    onNodeClick={(_event, node) =>
        setSelected(node)
    }

    onPaneClick={() =>
        setSelected(null)
    }

    nodeTypes={nodeTypes}

    defaultViewport={{
        x: 80,
        y: 80,
        zoom: 0.65,
    }}

    minZoom={0.4}
    maxZoom={1.5}

    fitView={false}

    proOptions={{
        hideAttribution: true,
    }}
>
    <MiniMap
        nodeStrokeWidth={3}
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
import {
  Handle,
  Position,
} from "reactflow";

const OtpNode = ({ data }) => {
  return (
    <>
      <div className="min-w-[240px] rounded-xl border border-purple-300 bg-white shadow-md">

        {/* Target */}
        <Handle
          type="target"
          position={Position.Top}
        />

        {/* YES */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="source-yes"
          style={{ left: "30%" }}
        />

        {/* NO */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="source-no"
          style={{ left: "70%" }}
        />

      </div>
    </>
  );
};

export default OtpNode;
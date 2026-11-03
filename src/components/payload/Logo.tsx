export default function Logo() {
  return (
    <div className="qjai-admin-logo">
      <img
        src="/brand/qianjie-ai-mark.svg"
        alt=""
        width={52}
        height={52}
        aria-hidden="true"
      />
      <span className="qjai-admin-logo__copy">
        <span className="qjai-admin-logo__name">
          潜界 <strong>AI</strong>
        </span>
        <span className="qjai-admin-logo__tagline">CONTENT STUDIO</span>
      </span>
    </div>
  )
}

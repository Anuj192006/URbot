function TextareaField({
  error,
  footer,
  htmlFor,
  label,
  note,
  required = false,
  rows = 5,
  ...props
}) {
  return (
    <div className="form-field">
      <label className="form-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="required-mark"> *</span> : null}
      </label>

      <textarea
        className={`text-input textarea-input${error ? ' input-shell-invalid' : ''}`}
        id={htmlFor}
        rows={rows}
        {...props}
      />

      {footer ? <div className="form-footer-row">{footer}</div> : null}
      {note ? <p className="form-note">{note}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export default TextareaField;

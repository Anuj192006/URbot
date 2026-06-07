function InputField({
  actions,
  error,
  htmlFor,
  label,
  note,
  required = false,
  ...props
}) {
  return (
    <div className="form-field">
      <label className="form-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="required-mark"> *</span> : null}
      </label>

      <div className={`input-shell${error ? ' input-shell-invalid' : ''}${actions ? ' input-shell-has-actions' : ''}`}>
        <input className="text-input" id={htmlFor} {...props} />
        {actions ? <div className="input-shell-actions">{actions}</div> : null}
      </div>

      {note ? <p className="form-note">{note}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export default InputField;

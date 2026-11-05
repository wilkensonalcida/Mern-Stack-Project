// A line with "or" in the middle, between two ways to do the same thing.
export default function OrDivider() {
  return (
    <div className="d-flex align-items-center gap-3 my-3">
      <hr className="flex-grow-1 m-0" aria-hidden="true" />
      <span className="text-body-secondary">or</span>
      <hr className="flex-grow-1 m-0" aria-hidden="true" />
    </div>
  )
}

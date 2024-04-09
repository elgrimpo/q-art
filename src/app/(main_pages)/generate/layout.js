export default function GenerateLayout({ children, modal }) {

  return (
    <div>
        {children}
        {modal}
    </div>
  );
}

export default function ImagePage({params}) {
  
  const {imageId} = params
  
  return (
      <div>
        <p>
          Image details: {imageId}
        </p>
      </div>

  );
}

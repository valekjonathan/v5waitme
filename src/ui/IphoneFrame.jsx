export default function IphoneFrame({ children }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'black',
      }}
    >
      <div
        style={{
          width: 390,
          height: 844,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 40,
          background: '#000',
        }}
      >
        {children}
      </div>
    </div>
  )
}

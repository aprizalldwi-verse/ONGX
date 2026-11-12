export default function ThemeScript() {
  const script = `(function(){try{var m=document.cookie.match(/(?:^|; )ongx_theme=(dark|light)/);document.documentElement.dataset.theme=m?m[1]:"dark";}catch(e){document.documentElement.dataset.theme="dark";}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

"use client";
import { Fragment } from "react";
import katex from "katex";

/** Render $...$, $$...$$, \(...\) and \[...\] without interpreting HTML from users. */
export default function MathText({text}:{text:string}) {
  const regex=/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;
  const segments=text.split(regex);
  return <>{segments.map((segment,index)=>{
    const display=segment.startsWith("$$") || segment.startsWith("\\[");
    const math=segment.startsWith("$$")?segment.slice(2,-2):segment.startsWith("$")?segment.slice(1,-1):segment.startsWith("\\")?segment.slice(2,-2):null;
    if(math===null)return <Fragment key={index}>{segment}</Fragment>;
    try{
      const html=katex.renderToString(math,{displayMode:display,throwOnError:true,trust:false,strict:"ignore",maxExpand:1000});
      return <span key={index} className="qv-math" dangerouslySetInnerHTML={{__html:html}}/>;
    }catch{return <Fragment key={index}>{segment}</Fragment>;}
  })}</>;
}

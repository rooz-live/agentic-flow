/** Portfolio Analyzer — SOXL/SOXS semiconductor ETF analysis */
export interface OHLCV { timestamp: Date; open: number; high: number; low: number; close: number; volume: number; }
export interface Option { strike: number; type: 'call'|'put'; expiry: Date; iv: number; gamma: number; delta: number; }
interface AnalysisInput { underlying: OHLCV[]; options: Option[]; soxl?: OHLCV[]; soxs?: OHLCV[]; }

export class PortfolioAnalyzer {
  static generateMockOHLCV(symbol: string, count: number): OHLCV[] {
    let price = 50; const data: OHLCV[] = [];
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * 4;
      const open = price; const close = price + change;
      data.push({ timestamp: new Date(Date.now() - (count-i)*86400000), open, high: Math.max(open,close)+Math.random()*2, low: Math.min(open,close)-Math.random()*2, close, volume: 1e6+Math.random()*1e6 });
      price = close;
    } return data;
  }
  static generateMockOptions(spotPrice: number, count: number): Option[] {
    return Array.from({length:count},(_,i)=>({ strike: spotPrice*(0.8+i*0.04), type: i%2===0?'call':'put' as 'call'|'put', expiry: new Date(Date.now()+30*86400000), iv: 0.2+Math.random()*0.3, gamma: 0.01+Math.random()*0.05, delta: i%2===0?0.5:-0.5 }));
  }
  static computeRSI(closes: number[], period=14): number[] {
    if(closes.length<period+1) return [];
    const rsi: number[]=[]; let avgGain=0,avgLoss=0;
    for(let i=1;i<=period;i++){const d=closes[i]-closes[i-1];if(d>0)avgGain+=d;else avgLoss+=Math.abs(d);}
    avgGain/=period;avgLoss/=period;rsi.push(100-100/(1+avgGain/(avgLoss||1e-10)));
    for(let i=period+1;i<closes.length;i++){const d=closes[i]-closes[i-1];avgGain=(avgGain*(period-1)+(d>0?d:0))/period;avgLoss=(avgLoss*(period-1)+(d<0?Math.abs(d):0))/period;rsi.push(100-100/(1+avgGain/(avgLoss||1e-10)));}
    return rsi;
  }
  static computeMACD(closes: number[], fast=12, slow=26, signal=9) {
    const ema=(d:number[],p:number)=>{const k=2/(p+1);const r=[d[0]];for(let i=1;i<d.length;i++)r.push(d[i]*k+r[i-1]*(1-k));return r;};
    const emaFast=ema(closes,fast),emaSlow=ema(closes,slow);
    const macd=emaFast.map((v,i)=>v-emaSlow[i]);const sig=ema(macd,signal);const hist=macd.map((v,i)=>v-sig[i]);
    return{macd,signal:sig,histogram:hist};
  }
  static computeBB(closes: number[], period=20, mult=2) {
    const middle:number[]=[],upper:number[]=[],lower:number[]=[];
    for(let i=period-1;i<closes.length;i++){const slice=closes.slice(i-period+1,i+1);const avg=slice.reduce((a,b)=>a+b)/period;const std=Math.sqrt(slice.reduce((a,b)=>a+(b-avg)**2,0)/period);middle.push(avg);upper.push(avg+mult*std);lower.push(avg-mult*std);}
    return{upper,middle,lower};
  }
  static analyzeSOXLPair(soxl: OHLCV[], soxs: OHLCV[]) {
    const len=Math.min(soxl.length,soxs.length)-1; const ratio:number[]=[];
    for(let i=1;i<=len;i++)ratio.push(soxl[i].close/soxs[i].close);
    const r1=soxl.slice(1,len+1).map((d,i)=>d.close/soxl[i].close-1);
    const r2=soxs.slice(1,len+1).map((d,i)=>d.close/soxs[i].close-1);
    const m1=r1.reduce((a,b)=>a+b,0)/r1.length,m2=r2.reduce((a,b)=>a+b,0)/r2.length;
    const cov=r1.reduce((a,v,i)=>a+(v-m1)*(r2[i]-m2),0)/r1.length;
    const s1=Math.sqrt(r1.reduce((a,v)=>a+(v-m1)**2,0)/r1.length);
    const s2=Math.sqrt(r2.reduce((a,v)=>a+(v-m2)**2,0)/r2.length);
    return{ratio,correlation:cov/(s1*s2||1e-10),signals:[]};
  }
  static scanVolPremium(options: Option[], threshold: number) { return options.filter(o=>o.iv>threshold); }
  static detectSqueeze(data: OHLCV[], period=20): boolean {
    if(data.length<period)return false;
    const closes=data.slice(-period).map(d=>d.close);const avg=closes.reduce((a,b)=>a+b)/period;
    const std=Math.sqrt(closes.reduce((a,b)=>a+(b-avg)**2,0)/period);return(std/avg)<0.01;
  }
  static scanHighGamma(options: Option[], threshold: number) { return options.filter(o=>o.gamma>threshold); }
  static computeVaR(returns: number[], confidence=0.95): number {
    const sorted=[...returns].sort((a,b)=>a-b); return sorted[Math.floor((1-confidence)*sorted.length)]||0;
  }
  static computeMaxDrawdown(prices: number[]): number {
    let peak=prices[0],mdd=0;for(const p of prices){if(p>peak)peak=p;const dd=(peak-p)/peak;if(dd>mdd)mdd=dd;}return mdd;
  }
  static analyze(input: AnalysisInput) {
    const closes=input.underlying.map(d=>d.close);
    return { ta:{rsi:this.computeRSI(closes),macd:this.computeMACD(closes),bb:this.computeBB(closes)},
      soxlSoxs: input.soxl&&input.soxs ? this.analyzeSOXLPair(input.soxl,input.soxs) : {ratio:[],correlation:0,signals:[]},
      scanners:{volPremium:this.scanVolPremium(input.options,0.4),squeeze:this.detectSqueeze(input.underlying),highGamma:this.scanHighGamma(input.options,0.08)},
      risk:{var95:this.computeVaR(closes.slice(1).map((c,i)=>c/closes[i]-1)),maxDrawdown:this.computeMaxDrawdown(closes)} };
  }
}

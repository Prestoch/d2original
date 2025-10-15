#!/usr/bin/env perl
use strict;use warnings;use JSON::PP qw(decode_json encode_json);use POSIX qw/strftime/;use HTTP::Tiny;

my $DEBUG=($ENV{DEBUG}||grep { $_ eq '--debug' } @ARGV)?1:0;

# Autoflush output
$| = 1;

my($http)=(HTTP::Tiny->new(
  agent=>'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  timeout=>60,
  verify_SSL=>0
));
my $FLARESOLVERR_URL=$ENV{FLARESOLVERR_URL}//'http://localhost:8191/v1';my $FLARE_SESSION_ID;my $FLARE_HEALTHY;
sub flare_healthy{ return $FLARE_HEALTHY if defined $FLARE_HEALTHY; return $FLARE_HEALTHY=0 unless $FLARESOLVERR_URL; my $h=$FLARESOLVERR_URL; $h=~s{/v1$}{/health}; my $r=$http->get($h); $FLARE_HEALTHY= ($r->{success}&&($r->{content}||'')=~/ok/i)?1:0; warn "FlareSolverr health: ".($FLARE_HEALTHY?'ok':'unavailable')."\n" if $DEBUG; return $FLARE_HEALTHY; }
sub flare_session_create{ return if !$FLARESOLVERR_URL||$FLARE_SESSION_ID; my $r=$http->post($FLARESOLVERR_URL,{headers=>{'Content-Type'=>'application/json'},content=>'{"cmd":"sessions.create"}'});if($r->{success}){my $j;eval{$j=decode_json($r->{content});};$FLARE_SESSION_ID=$j->{session} if !$@&&$j&&$j->{session};warn "Created FlareSolverr session: $FLARE_SESSION_ID\n" if $DEBUG&&$FLARE_SESSION_ID;}}
sub flare_session_destroy{ return unless $FLARE_SESSION_ID; my $p='{"cmd":"sessions.destroy","session":"'.$FLARE_SESSION_ID.'"}';$http->post($FLARESOLVERR_URL,{headers=>{'Content-Type'=>'application/json'},content=>$p});$FLARE_SESSION_ID=undef;}
sub fetch_html{ my($url)=@_; if($FLARESOLVERR_URL && flare_healthy()){flare_session_create(); my $p='{"cmd":"request.get","url":"'.$url.'","maxTimeout":60000'.($FLARE_SESSION_ID?',"session":"'.$FLARE_SESSION_ID.'"':'').',"headers":{"User-Agent":"'.$http->{agent}.'"}}'; my $r=$http->post($FLARESOLVERR_URL,{headers=>{'Content-Type'=>'application/json'},content=>$p}); if($r->{success}){my $j;eval{$j=decode_json($r->{content});};return $j->{solution}{response} if !$@&&$j&&$j->{status}&&$j->{status} eq 'ok'&&$j->{solution}&&$j->{solution}{response};}} my $r2=$http->get($url);return $r2->{success}?$r2->{content}:undef;}
sub norm{ my($t)=@_;$t//= ''; $t=~s/&[^;]+;//g;$t=~s/'//g;$t=~s/^\s+|\s+$//g;return $t;}
sub slug_from_name{ my($n)=@_;$n=~s/'//g;$n=~s/ /-/g;$n=~tr/[A-Z]/[a-z]/;return $n;}
sub extract_header_wr{ my($h)=@_;return undef unless $h; my $s=$h; $s=$1 if $s=~m{^(.*?<table)}is; return $1 if $s=~m{<dt>\s*Win Rate\s*</dt>\s*<dd[^>]*>\s*(?:<span[^>]*class="(?:won|lost)"[^>]*>)?\s*([0-9]+(?:\.[0-9]+)?)%}is; return $1 if $s=~m{<dd[^>]*>\s*(?:<span[^>]*class="(?:won|lost)"[^>]*>)?\s*([0-9]+(?:\.[0-9]+)?)%\s*</dd>\s*<dt>\s*Win Rate\s*</dt>}is; return $2 if $s=~m{Win\s*Rate(.{0,400})<span[^>]*class="(?:won|lost)"[^>]*>\s*([0-9]+(?:\.[0-9]+)?)%}is; return $1 if $s=~m{<span[^>]*class="(?:won|lost)"[^>]*>\s*([0-9]+(?:\.[0-9]+)?)%}is; return undef;}

my(@heroes,@heroes_bg,@heroes_wr,@win_rates,%slug_to_index,%db_roles_wr,%db_roles_change);

sub get_heroes{
  warn "Fetching hero list and images from Dotabuff\n" if $DEBUG;
  
  # Fetch from winning page to get hero list and images
  my $url='https://www.dotabuff.com/heroes?show=heroes&view=winning&mode=all-pick&date=1y';
  my $html=fetch_html($url)//die "Failed to fetch heroes page";
  my(%seen,%slug_img,@pairs);
  
  # Extract hero links
  while($html=~m{<a[^>]*href="(?:https?://www\.dotabuff\.com)?/heroes/([a-z0-9-]+)["#]}ig){
    my $slug=$1;
    next if $slug=~/(?:meta|played|winning|damage|economy|lanes|statistics|compare|guides|matchups|positions|talents|trends)/i;
    next if $seen{$slug}++;
    my $name=$slug; $name=~s/-/ /g; $name=~s/\b(\w)/\U$1/g; $name=norm($name);
    push @pairs,[$name,$slug];
  }
  
  # Extract hero images
  while($html=~m{(/assets/heroes/([a-z0-9-]+)[^"]*?\.jpg)}ig){
    $slug_img{$2}//='https://www.dotabuff.com'.$1;
  }
  
  @pairs=sort{ lc($a->[0]) cmp lc($b->[0]) }@pairs;
  
  for my $p(@pairs){
    my($name,$slug)=@$p;
    push @heroes,$name;
    $slug_to_index{$slug}=$#heroes;
    my $img=$slug_img{$slug};
    if(!$img){
      my $rs=$slug; $rs=~s/[^a-z0-9]+/_/g;$rs=~s/__+/_/g;
      $img="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/$rs.png"
    }
    push @heroes_bg,$img;
    push @heroes_wr,sprintf('%.2f',50.0);  # Placeholder (not used, only per-role WR used)
  }
  warn "Loaded ".scalar(@heroes)." heroes with images\n" if $DEBUG;
}

sub get_overall_winrates{
  # Fetch general win rates (no position filter) for counter pick display
  warn "Fetching general win rates from winning page\n" if $DEBUG;
  my $url='https://www.dotabuff.com/heroes?show=heroes&view=winning&mode=all-pick&date=1y';
  my $html=fetch_html($url);
  
  if($html){
    my $map=_parse_wr_map_from_html($html);
    for(my $i=0;$i<@heroes;$i++){
      my $slug=slug_from_name($heroes[$i]);
      if($map->{$slug} && defined $map->{$slug}{wr}){
        $heroes_wr[$i]=$map->{$slug}{wr};
      }else{
        $heroes_wr[$i]=sprintf('%.2f',50.0);
      }
    }
    warn "Fetched general WR for ".scalar(keys %$map)." heroes\n" if $DEBUG;
  }else{
    # Fallback to 50% if fetch failed
    for(my $i=0;$i<@heroes;$i++){
      $heroes_wr[$i]=sprintf('%.2f',50.0);
    }
  }
}

sub get_heroes_from_cs{
  my $cs='cs.json'; return unless -f $cs;
  open my $fh,'<',$cs or return; local $/; my $s=<$fh>; close $fh;
  my($arr)=$s=~m{var\s+heroes\s*=\s*(\[[^;]+\])}s; return unless $arr;
  my $j; eval { $j=decode_json($arr); }; return if $@ || ref $j ne 'ARRAY';
  @heroes=@$j; for(my $i=0;$i<@heroes;$i++){ my $slug=lc $heroes[$i]; $slug=~s/'//g; $slug=~s/\s+/-/g; $slug=~s/[^a-z0-9-]+//g; $slug_to_index{$slug}=$i; $heroes_bg[$i]//= ""; $heroes_wr[$i]//= sprintf('%.2f',50.0); }
  warn "Loaded heroes from cs.json: ".scalar(@heroes)."\n" if $DEBUG;
}

sub get_heroes_from_winning_roles{
  my %role_url = (
    'core-mid'      => 'mid',
    'core-safe'     => 'carry',
    'core-off'      => 'offlane',
    'support-safe'  => 'hardsupport',
    'support-off'   => 'softsupport',
  );
  my $base='https://www.dotabuff.com/heroes?show=heroes&view=winning&mode=all-pick&date=1y&position=';
  my %seen;
  while(my($pos,$role)=each %role_url){
    my $url=$base.$pos; warn "Discover heroes from: $url\n" if $DEBUG;
    my $html=fetch_html($url); next unless $html;
    while($html=~m{href="(?:https?://www\.dotabuff\.com)?/heroes/([a-z0-9-]+)["#]}ig){ my $slug=$1; next if $slug=~/(?:meta|played|winning|damage|economy|lanes|statistics|compare|guides|matchups|positions|talents|trends)/i; $seen{$slug}=1; }
  }
  my @slugs = sort keys %seen;
  for my $slug (@slugs){ my $name=$slug; $name=~s/-/ /g; $name=~s/\b(\w)/\U$1/g; push @heroes,$name; $slug_to_index{$slug}=$#heroes; $heroes_bg[$#heroes]=""; $heroes_wr[$#heroes]=sprintf('%.2f',50.0); }
  warn "Loaded heroes from winning pages: ".scalar(@heroes)."\n" if $DEBUG;
}

sub get_counters_for_hero{
  my($idx)=@_; my $slug=slug_from_name($heroes[$idx]); my $url='https://www.dotabuff.com/heroes/'.$slug.'/counters?date=year'; warn "Getting Dotabuff counters for $heroes[$idx] at $url\n" if $DEBUG; my $html=fetch_html($url); return unless $html;
  if(!defined $heroes_wr[$idx]||$heroes_wr[$idx] eq '50.00'){ my $wr=extract_header_wr($html); if(defined $wr){ $heroes_wr[$idx]=sprintf('%.2f',$wr);} else { my $main=fetch_html('https://www.dotabuff.com/heroes/'.$slug); if($main){ my $wr2=extract_header_wr($main); $heroes_wr[$idx]=sprintf('%.2f',$wr2) if defined $wr2; }}}
  while($html=~m{<tr[^>]*>(.*?)</tr>}sig){ my $row=$1; my($s2)=$row=~m{<a[^>]+href="/heroes/([a-z0-9-]+)["#]}i; next unless $s2; my $opp=$slug_to_index{$s2}; next unless defined $opp; my @vals=($row=~m{<td[^>]*data-value="([\-0-9.,]+)"}gi); my($adv,$wr_vs)=(undef,undef); if(@vals>=2){($adv,$wr_vs)=($vals[0],$vals[1]);} else { my @tds=($row=~m{<td[^>]*>(.*?)</td>}sig); for my $td(@tds){ my($n)=$td=~m{([\-+]?\d+(?:\.\d+)?)%}i; next unless defined $n; if(!defined $adv){$adv=$n;next} if(!defined $wr_vs){$wr_vs=$n;last} }} for($adv,$wr_vs){$_=defined $_?$_:0; s/,//g} my($m)=$row=~m{data-value="([0-9,]+)"[^>]*>\s*[0-9,]+\s*<}i; $m//=0; $m=~s/,//g; $win_rates[$idx][$opp]=[sprintf('%.4f',$adv+0),sprintf('%.4f',$wr_vs+0),0+$m]; }
}
sub get_winrates{
  warn "Fetching Dotabuff counters for all heroes (".scalar(@heroes).")\n" if $DEBUG;
  for(my $i=0;$i<@heroes;$i++){ get_counters_for_hero($i) }
  my $filled=0; for my $h (0..$#heroes){ $filled++ if ref $win_rates[$h] eq 'ARRAY' }
  warn "Counters fetched for $filled heroes\n" if $DEBUG;
}

sub _parse_wr_map_from_html{
  my($html)=@_;
  my %map;
  
  # Parse WR from winning page - try multiple patterns
  while($html=~m{<tr[^>]*>(.*?)</tr>}sig){
    my $row=$1;
    my($slug)=$row=~m{href="(?:https?://www\.dotabuff\.com)?/heroes/([a-z0-9-]+)["#]}i;
    next unless $slug;
    
    my $wr;
    
    # Try pattern 1: <span>NUMBER<!-- -->%</span>
    if($row =~ m{<span[^>]*>([0-9.]+)<!--[^>]*-->%</span>}i){
      $wr = $1;
    }
    # Try pattern 2: data-value attribute (second column)
    elsif(my @data_values = ($row =~ m{<td[^>]*data-value="([^"]+)"}g)){
      if(@data_values >= 2){
        $wr = $data_values[1];
        $wr =~ s/,//g;
      }
    }
    
    if(defined $wr){
      $map{$slug}={};
      $map{$slug}{wr}=sprintf('%.2f',$wr+0);
    }
  }
  return \%map;
}

sub _parse_change_map_from_html{
  my($html)=@_;
  my %map;
  
  # Meta page columns: Hero | Tier | Pick Rate | Change
  while($html=~m{<tr[^>]*>(.*?)</tr>}sig){
    my $row=$1;
    my($slug)=$row=~m{href="(?:https?://www\.dotabuff\.com)?/heroes/([a-z0-9-]+)["#]}i;
    next unless $slug;
    
    # Look for the Change percentage in the row
    # Pattern: <span>NUMBER<!-- -->%</span> or <span>-NUMBER<!-- -->%</span>
    # The sign might already be included in the span
    my $change;
    
    # Try to find the change percentage - it's typically in a span after a chevron SVG icon
    # Pattern 1: Number with sign already included (e.g., "-1.89")
    if($row =~ m{<svg[^>]*lucide-square-chevron-(?:up|down)[^>]*>.*?</svg>\s*<span[^>]*>([\-+]?[0-9.]+)<!--[^>]*-->%</span>}is){
      $change = $1;
    }
    # Pattern 2: In a div with color classes
    elsif($row =~ m{tw-text-(?:green|red|stone)-\d+[^>]*>\s*<svg[^>]*lucide-square-chevron-(?:up|down)[^>]*>.*?</svg>\s*<span[^>]*>([\-+]?[0-9.]+)<!--[^>]*-->%</span>}is){
      $change = $1;
    }
    # Pattern 3: Just look for the percentage in a span
    elsif($row =~ m{tw-gap-2[^>]*>[^<]*<svg[^>]*>.*?</svg>\s*<span[^>]*>([\-+]?[0-9.]+)<!--[^>]*-->%}is){
      $change = $1;
    }
    
    if(defined $change){
      # Check if sign is already included
      if($change =~ m{^[\-+]}){
        # Sign already present, use as-is
        $map{$slug}={};
        $map{$slug}{change}=sprintf('%.2f',$change+0) >= 0 ? sprintf('+%.2f',$change+0) : sprintf('%.2f',$change+0);
      } else {
        # No sign, determine based on chevron direction/color
        my $sign = '+';
        if($row =~ m{lucide-square-chevron-down}i || $row =~ m{tw-text-red-}i){
          $sign = '-';
        }
        $map{$slug}={};
        $map{$slug}{change}=sprintf('%s%.2f',$sign,$change+0);
      }
    }
  }
  
  return \%map;
}

sub get_dotabuff_roles_wr{
  my %role_url = (
    'core-mid'      => 'mid',
    'core-safe'     => 'carry',
    'core-off'      => 'offlane',
    'support-safe'  => 'hardsupport',
    'support-off'   => 'softsupport',
  );
  my $base='https://www.dotabuff.com/heroes?show=heroes&view=winning&mode=all-pick&date=1y&position=';
  
  for my $r (values %role_url){ $db_roles_wr{$r}=[]; }
  
  while(my($pos,$role)=each %role_url){
    my $url=$base.$pos;
    warn "Fetching $role WR from $url\n" if $DEBUG;
    my $html=fetch_html($url);
    
    unless($html){
      warn "Failed to fetch $role data\n" if $DEBUG;
      # Fill with defaults
      for(my $i=0;$i<@heroes;$i++){
        $db_roles_wr{$role}[$i] = sprintf('%.2f',50.0);
      }
      next;
    }
    
    # Parse WR from winning page
    my $map=_parse_wr_map_from_html($html);
    
    for(my $i=0;$i<@heroes;$i++){
      my $slug=slug_from_name($heroes[$i]);
      my $wr = ($map->{$slug} && defined $map->{$slug}{wr})  ? $map->{$slug}{wr}  : 50;
      
      $db_roles_wr{$role}[$i] = sprintf('%.2f',$wr+0);
    }
    
    warn "Parsed ".scalar(keys %$map)." heroes for $role (WR)\n" if $DEBUG;
  }
}

sub get_dotabuff_roles_change{
  my %role_url = (
    'core-mid'      => 'mid',
    'core-safe'     => 'carry',
    'core-off'      => 'offlane',
    'support-safe'  => 'hardsupport',
    'support-off'   => 'softsupport',
  );
  my $base='https://www.dotabuff.com/heroes?show=heroes&view=meta&mode=all-pick&date=1y&position=';
  
  for my $r (values %role_url){ $db_roles_change{$r}=[]; }
  
  while(my($pos,$role)=each %role_url){
    my $url=$base.$pos;
    warn "Fetching $role Change% from $url\n" if $DEBUG;
    my $html=fetch_html($url);
    
    unless($html){
      warn "Failed to fetch $role Change data\n" if $DEBUG;
      # Fill with defaults
      for(my $i=0;$i<@heroes;$i++){
        $db_roles_change{$role}[$i] = '+0.00';
      }
      next;
    }
    
    # Parse Change% from meta page
    my $map=_parse_change_map_from_html($html);
    
    for(my $i=0;$i<@heroes;$i++){
      my $slug=slug_from_name($heroes[$i]);
      my $change = ($map->{$slug} && defined $map->{$slug}{change}) ? $map->{$slug}{change} : '+0.00';
      
      $db_roles_change{$role}[$i] = $change;
    }
    
    warn "Parsed ".scalar(keys %$map)." heroes for $role (Change%)\n" if $DEBUG;
  }
}

sub write_db_out{
  open my $fh,'>cs_db.json' or die $!;
  my $j=JSON::PP->new;
  # Base arrays (heroes list and images)
  print $fh 'var heroes = ',$j->encode([@heroes]);
  print $fh ', heroes_bg = ',$j->encode([@heroes_bg]);
  # General win rates (for counter pick display, no position filter)
  print $fh ', heroes_wr = ',$j->encode([@heroes_wr]);
  # Per-role WR from Dotabuff winning pages
  my %db_roles_out=(carry=>{},mid=>{},offlane=>{},softsupport=>{},hardsupport=>{});
  for my $rk(keys %db_roles_out){ 
    $db_roles_out{$rk}{wr}=$db_roles_wr{$rk} if exists $db_roles_wr{$rk}; 
  }
  print $fh ', heroes_roles_db_wr = ',$j->encode(\%db_roles_out);
  # Per-role Change% from Dotabuff meta pages
  my %change_roles_out=(carry=>{},mid=>{},offlane=>{},softsupport=>{},hardsupport=>{});
  for my $rk(keys %change_roles_out){ 
    $change_roles_out{$rk}{change}=$db_roles_change{$rk} if exists $db_roles_change{$rk}; 
  }
  print $fh ', heroes_roles_change = ',$j->encode(\%change_roles_out);
  # Counter matchup matrix
  print $fh ', win_rates = ',$j->encode([@win_rates]);
  print $fh ', update_time = "',strftime("%Y-%m-%d",localtime),'";';
  print $fh "\n"; close $fh;
}

warn "Starting Dotabuff scrape\n" if $DEBUG;

# Get heroes list and images
eval { get_heroes(); 1 } or warn $@;
if (!@heroes) {
  die "Failed to fetch heroes";
}

# Set base heroes_wr to 0 (not used, only per-role WR matters)
get_overall_winrates();

# Get per-role WR from winning pages
warn "Fetching per-role WR...\n" if $DEBUG;
get_dotabuff_roles_wr();

# Get per-role Change% from meta pages
warn "Fetching per-role Change%...\n" if $DEBUG;
get_dotabuff_roles_change();

# Get counter matchup data
warn "Fetching counter matchups for ".scalar(@heroes)." heroes...\n" if $DEBUG;
get_winrates();

# Write output
write_db_out();
flare_session_destroy();

warn "Successfully wrote cs_db.json with ".scalar(@heroes)." heroes\n" if $DEBUG;

